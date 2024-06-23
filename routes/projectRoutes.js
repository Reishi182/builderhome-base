import express from 'express';
import { protect } from '../controller/authController.js';
import {
  checkBodyProject,
  checkProject,
  checkProjectId,
  createProject,
  deleteProject,
  getAllProjects,
  getProject,
  updateProject,
} from '../controller/projectController.js';
const router = express.Router();
router.param('id', checkProjectId);
router
  .route('/')
  .get(getAllProjects)
  .post(protect, checkBodyProject, createProject);
router
  .route('/:id')
  .get(getProject)
  .patch(protect, checkBodyProject, updateProject)
  .delete(protect, deleteProject);

export default router;
