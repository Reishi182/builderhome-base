import { body, validationResult } from 'express-validator';
import { findUser, findUserById } from '../controller/userController.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
export const userValidationRules = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .custom(async (value) => {
      const user = await findUser(null, value);
      if (user) {
        return Promise.reject('Username already in use');
      }
    }),
  body('email')
    .isEmail()
    .withMessage('Email is invalid')
    .notEmpty()
    .withMessage('Email is required')
    .custom(async (value) => {
      const user = await findUser(value, null);
      if (user) {
        return Promise.reject('Email already in use');
      }
    }),
  body('role').notEmpty().withMessage('Role is missing'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('passwordConfirmation')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
];

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const error = errors.array()[0];
  return res.status(400).json({ errors: error });
};

export async function comparePasswords(enteredPassword, hashedPassword) {
  return await bcrypt.compare(enteredPassword, hashedPassword);
}

export async function changedPasswordAfter(user, jwtTimeStamp) {
  if (user.passwordChangedAt) {
    const changedTimestamp = Math.floor(
      new Date(user.passwordChangedAt).getTime() / 1000
    );
    return jwtTimeStamp < changedTimestamp;
  }

  return false;
}
export async function createResetPasswordToken(userId) {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const tokenExpiry = new Date(Date.now() + 600000);

  await db.query(
    'UPDATE users SET passwordResetToken = ?, passwordResetExp = ? WHERE id = ?',
    [hashedToken, tokenExpiry, userId]
  );

  return resetToken;
}

export async function checkToken(req, res, next) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const [user] = await db.query(
    'SELECT * FROM users WHERE passwordResetToken = ? AND passwordResetExp > ? LIMIT 1',
    [hashedToken, new Date()]
  );

  if (user.length === 0)
    return res
      .status(400)
      .json({ status: 'fail', message: 'Token is Invalid or has expired' });

  next();
}
