import { promisify } from 'util';
import db from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  changedPasswordAfter,
  comparePasswords,
  createResetPasswordToken,
} from '../validation/userValidator.js';
import { findUser, findUserById } from './userController.js';
import { sendEmail } from '../utils/email.js';

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXP,
  });
}

export async function signup(req, res) {
  try {
    delete req.body.passwordConfirmation;

    const salt = await bcrypt.genSalt(12);
    const password = await bcrypt.hash(req.body.password, salt);
    const data = { ...req.body, password };

    const [result] = await db.query('INSERT INTO users SET ? ', [data]);
    const userId = result.insertId;
    const token = signToken(userId);

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    delete user.password;

    return res.status(201).json({
      status: 'Success',
      token,
      message: 'Successfully Created A User',
      data: { user },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'Error',
      message: 'An error occurred while processing your request',
      error: error.message,
    });
  }
}

export async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Please Provide Email or Password' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [
      email,
    ]);
    const user = rows[0];

    if (!user || !(await comparePasswords(password, user.password))) {
      return res
        .status(401)
        .json({ status: 'fail', message: 'Incorrect Email or Password' });
    }

    const userData = { ...user };
    delete userData.password;
    const token = signToken(user.id);

    return res.status(200).json({
      status: 'success',
      token,
      user: userData,
    });
  } catch (error) {
    return res.status(401).json({ status: 'fail', message: error.message });
  }
}

export async function protect(req, res, next) {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ status: 'fail', message: "You're Not logged In" });
  }

  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token payload',
      });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [
      decoded.id,
    ]);
    const currentUser = rows[0];

    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists',
      });
    }

    const test = await changedPasswordAfter(currentUser, decoded.iat);
    if (test) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password! Please login again.',
      });
    }

    req.user = currentUser;
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res
        .status(401)
        .json({ status: 'error', message: 'Invalid Token Please Login Again' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Your Token Has Expired! Please Login Again',
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Something went wrong with authentication',
    });
  }

  next();
}

export async function forgotPassword(req, res) {
  const user = await findUser(req.body.email);
  if (!user)
    return res
      .status(400)
      .json({ status: 'fail', message: 'There is No user with email address' });

  const resetToken = await createResetPasswordToken(user.id);
  const resetURL = `https://https://builder-home.vercel.app/reset_password/${resetToken}`;
  const message = `Forgot Your Password? Submit a Request with your new Password and password confirmation to: ${resetURL}\nIf You didn't forget your password, please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (Valid for 10min)',
      message,
    });

    res
      .status(200)
      .json({ status: 'success', message: 'Token has been sent to your mail' });
  } catch (err) {
    await db.query(
      'UPDATE users SET passwordResetToken = ?, passwordResetExp = ? WHERE id = ?',
      [null, null, user.id]
    );
    return res.status(400).json({
      status: 'error',
      message: 'There was an error sending the email. Try again later!',
    });
  }
}

export async function resetPassword(req, res) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const [row] = await db.query(
    'SELECT * FROM users where passwordResetToken =  ? and passwordResetExp > ?',
    [hashedToken, new Date()]
  );

  const user = row[0];
  if (!user)
    return res
      .status(400)
      .json({ status: 'fail', message: 'Token is Invalid or has expired' });
  if (req.body.password !== req.body.passwordConfirmation)
    return res.status(400).json({
      status: 'error',
      message: 'Password confirmation does not match password',
    });

  const salt = await bcrypt.genSalt(12);
  const password = await bcrypt.hash(req.body.password, salt);

  const data = {
    password,
    passwordResetExp: null,
    passwordResetToken: null,
    passwordChangedAt: new Date(),
  };
  await db.query('UPDATE users SET ? WHERE id = ?', [data, user.id]);
  console.log(data);
  const token = signToken(user.id);

  return res.status(201).json({
    status: 'Success',
    token,
    message: 'Successfully changed your password',
  });
}

export async function changePassword(req, res) {
  try {
    const id = +req.params.id;
    const user = await findUserById(id);

    if (!(await comparePasswords(req.body.oldPassword, user.password))) {
      return res.status(400).json({
        status: 'error',
        message: 'Your Old Password is Incorrect',
      });
    }
    if (req.body.password !== req.body.passwordConfirmation)
      return res.status(400).json({
        status: 'error',
        message: 'Password confirmation does not match password',
      });

    const salt = await bcrypt.genSalt(12);
    const password = await bcrypt.hash(req.body.password, salt);

    const data = {
      password,
      passwordResetExp: null,
      passwordResetToken: null,
      passwordChangedAt: new Date(),
    };

    await db.query(
      'UPDATE users SET password = ?, passwordResetExp = ?, passwordResetToken = ?, passwordChangedAt = ? WHERE id = ?',
      [
        data.password,
        data.passwordResetExp,
        data.passwordResetToken,
        data.passwordChangedAt,
        id,
      ]
    );

    const token = signToken(id);

    return res.status(201).json({
      status: 'Success',
      token,
      message: 'Successfully changed your password',
    });
  } catch (err) {
    return res.status(400).json({
      status: 'err',
      message: 'There is something wrong',
    });
  }
}
