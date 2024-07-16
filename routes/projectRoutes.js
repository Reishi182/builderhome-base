import express from 'express';
import { protect } from '../controller/authController.js';
import {
  checkBodyProject,
  checkProjectId,
  createProject,
  deleteProject,
  getAllProjects,
  getAllUsersProjects,
  getProject,
  updateProject,
} from '../controller/projectController.js';
const router = express.Router();
router.param('id', checkProjectId);
router
  .route('/')
  .get(getAllProjects)
  .post(protect, checkBodyProject, createProject);

router.get('/userProjects/:userId', getAllUsersProjects);

router
  .route('/:id')
  .get(getProject)
  .patch(protect, updateProject)
  .delete(protect, deleteProject);

export default router;
