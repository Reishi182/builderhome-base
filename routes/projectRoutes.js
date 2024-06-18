import express from 'express';
import { protect } from '../controller/authController.js';
import {
  checkProjectId,
  createProject,
  deleteProject,
  getAllProjects,
  getProject,
  updateProject,
} from '../controller/projectController.js';
const router = express.Router();
router.param('id', checkProjectId);
router.route('/').get(protect, getAllProjects).post(protect, createProject);
router
  .route('/:id')
  .get(protect, getProject)
  .patch(protect, updateProject)
  .delete(protect, deleteProject);

export default router;
