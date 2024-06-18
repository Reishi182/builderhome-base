import e from 'express';
import db from '../db.js';

export async function checkProjectId(req, res, next) {
  const projectId = Number(req.params.id);
  const [projects] = await db.query(
    'SELECT * FROM project WHERE project_id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Project not found',
    });
  }

  next();
}

export async function getProject(req, res) {
  try {
    const projectId = Number(req.params.id);
    const [projects] = await db.query(
      'SELECT * FROM project WHERE user_id = ?',
      [projectId]
    );
    return res.status(200).json({ status: 'success', data: { projects } });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function getAllProjects(req, res) {
  try {
    const [projects] = await db.query('SELECT * FROM project');
    return res.status(200).json({ status: 'success', data: { projects } });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function createProject(req, res) {
  try {
    const [data] = await db.query('INSERT INTO project SET ?', [req.body]);
    const [result] = await db.query(
      'SELECT * from project WHERE project_id = ?',
      [data.insertId]
    );
    const project = result[0];
    return res.status(201).json({ status: 'success', data: { project } });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function deleteProject(req, res) {
  try {
    const id = Number(req.params.id);
    await db.query('DELETE from project WHERE project_id = ?', [id]);
    return res
      .status(200)
      .json({ status: 'success', message: 'Successfully delete the project' });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function updateProject(req, res) {
  try {
    const id = Number(req.params.id);
    const [data] = await db.query('UPDATE project set ? where project_id = ?', [
      req.body,
      id,
    ]);
    const [result] = await db.query(
      'SELECT * from project WHERE project_id = ?',
      [data.insertId]
    );
    const project = result[0];
    return res.status(200).json({
      status: 'success',
      message: 'Successfully update your project',
      data: { project },
    });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}
