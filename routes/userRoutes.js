import express from 'express';
import {
  checkId,
  deleteUser,
  getPassToken,
  getUserById,
  getUsers,
  updateUserInfo,
} from '../controller/userController.js';
import {
  checkToken,
  userValidationRules,
  validate,
} from '../validation/userValidator.js';
import {
  login,
  signup,
  protect,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controller/authController.js';

const router = express.Router();
router.post('/signup', userValidationRules, validate, signup);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.get('/resetPassword/:token', getPassToken);
router.patch('/resetPassword/:token', checkToken, resetPassword);
router.patch('/changePassword/:id', protect, changePassword);

router.route('/').get(getUsers);
router.param('id', checkId);

router
  .route('/:id')
  .get(getUserById)
  .patch(protect, updateUserInfo)
  .delete(protect, deleteUser);

export default router;
