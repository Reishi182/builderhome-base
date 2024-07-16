const router = express.Router();
import express from 'express';
import { protect } from '../controller/authController.js';
import {
  addWishlist,
  deleteWishlist,
  getWishlist,
} from '../controller/projectController.js';

router.post('/', protect, addWishlist);
router.get('/:id', getWishlist);
router.delete('/:id', deleteWishlist);

export default router;
