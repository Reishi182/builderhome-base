import db from '../db.js';
import crypto from 'crypto';

export async function checkId(req, res, next) {
  const userId = req.params.id;
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

  if (users.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'User not found',
    });
  }

  next();
}

export async function getPassToken(req, res) {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const [user] = await db.query(
    'SELECT * FROM users WHERE passwordResetToken = ? AND passwordResetExp > ? LIMIT 1',
    [hashedToken, new Date()]
  );

  if (user.length === 0) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Token is invalid or has expired' });
  }

  res.status(200).json({ status: 'success', message: 'Token is valid' });
}

export async function findUser(email, username) {
  if (!email && !username) {
    return;
  }

  let query = 'SELECT * FROM users WHERE';
  const params = [];

  if (email) {
    query += ' email = ?';
    params.push(email);
  }

  if (username) {
    if (params.length > 0) {
      query += ' OR';
    }
    query += ' username = ?';
    params.push(username);
  }

  query += ' LIMIT 1';
  const [user] = await db.query(query, params);

  return user[0];
}

export async function findUserById(id) {
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return users[0];
}

export async function getUsers(req, res) {
  const [users] = await db.query(
    `SELECT * FROM users 
     JOIN user_information ON users.id = user_information.user_id where users.role="Arsitek"`
  );

  return res
    .status(200)
    .json({ status: 'success', results: users.length, data: { users } });
}

export async function updateUserInfo(req, res) {
  const userId = Number(req.params.id);

  try {
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    await db.query('UPDATE users SET username = ?, email = ? WHERE id = ?', [
      req.body.username,
      req.body.email,
      userId,
    ]);

    const userInfoUpdate = { ...req.body };
    delete userInfoUpdate.oldPassword;
    delete userInfoUpdate.password;
    delete userInfoUpdate.passwordConfirmation;
    delete userInfoUpdate.username;
    delete userInfoUpdate.email;

    const fields = Object.keys(userInfoUpdate)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(userInfoUpdate).concat(userId);

    if (fields.length > 0) {
      await db.query(
        `UPDATE user_information SET ${fields} WHERE user_id = ?`,
        values
      );
    }

    return res.status(200).json({
      status: 'success',
      message: 'User information successfully updated',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
}

export async function deleteUser(req, res) {
  const userId = Number(req.params.id);

  try {
    const [datas] = await db.query(
      `SELECT project_id from projects where user_id =? `,
      [userId]
    );
    if (datas) {
      const deletePromises = datas.map((data) => {
        return db.query('DELETE FROM project_images WHERE project_id = ?', [
          data.project_id,
        ]);
      });
      await Promise.all(deletePromises);
    }

    await db.query('DELETE FROM projects WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM user_information WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    return res.status(200).json({
      status: 'success',
      message: 'User successfully deleted',
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
      error: error.message,
    });
  }
}

export async function getUserById(req, res) {
  const userId = Number(req.params.id);

  try {
    const [user] = await db.query(
      `SELECT * FROM users 
       JOIN user_information ON users.id = user_information.user_id 
       WHERE users.id = ? LIMIT 1`,
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    delete user[0].password;
    return res.status(200).json({
      status: 'success',
      data: { user: user[0] },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the user',
      error: error.message,
    });
  }
}
