import e from 'express';
import db from '../db.js';

export async function checkProjectId(req, res, next) {
  const projectId = Number(req.params.id);
  const [projects] = await db.query(
    'SELECT * FROM projects WHERE project_id = ?',
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

export async function getSingleProject(id) {
  const projectId = +id;
  const [row] = await db.query(
    `SELECT p.*, ui.linkedin, ui.instagram,ui.rating,u.username
     FROM projects p
     LEFT JOIN user_information ui ON p.user_id = ui.user_id
      LEFT JOIN users u ON p.user_id = u.id
     WHERE p.project_id = ?`,
    [projectId]
  );
  const [imagesData] = await db.query(
    'SELECT image_url FROM project_images where project_id = ?',
    [projectId]
  );
  const images_url = imagesData.map((image) => image.image_url);
  return { project: row[0], images_url };
}
export async function checkProject(req, res, next) {
  const [projects] = await db.query('SELECT * FROM projects');

  if (projects.length === 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'There is no project',
    });
  }

  next();
}

export async function checkBodyProject(req, res, next) {
  const [projects] = await db.query('SELECT * FROM projects');
  const existingProject = projects.find(
    (project) => project.projectName === req.body.projectName
  );
  if (existingProject) {
    return res
      .status(400)
      .json({ status: 'failed', message: 'project has already Existed' });
  }
  next();
}

export async function getProject(req, res) {
  try {
    const projectId = Number(req.params.id);
    const { project, images_url } = await getSingleProject(projectId);
    return res.status(200).json({
      status: 'success',
      data: { project: { ...project, images: images_url } },
    });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function getAllProjects(req, res) {
  try {
    const [projectsQuery] = await db.query(`
      SELECT p.*, pi.image_url,pi.image_id,u.username, ui.linkedin, ui.instagram
      FROM projects p
      LEFT JOIN project_images pi ON p.project_id = pi.project_id
      LEFT JOIN user_information ui ON p.user_id = ui.user_id
      LEFT JOIN users u ON p.user_id = u.id
    `);

    const projectsMap = projectsQuery.reduce((map, row) => {
      if (!map.has(row.project_id)) {
        map.set(row.project_id, {
          ...row,
          image_url: row.image_url ? [row.image_url] : [],
          linkedin: row.linkedin,
          instagram: row.instagram,
        });
      } else {
        const project = map.get(row.project_id);
        if (row.image_url) {
          project.image_url.push(row.image_url);
        }
      }
      return map;
    }, new Map());

    const response = Array.from(projectsMap.values());
    return res
      .status(200)
      .json({ status: 'success', data: { projects: response } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
export async function getAllUsersProjects(req, res) {
  if (typeof req.params.userId === 'object') {
    JSON.stringify(req.params.userId);
  }

  if (!req.params.userId)
    return res.status(400).json({ status: 'error', message: 'There is no id' });

  try {
    const [projectsQuery] = await db.query(
      `
      SELECT p.*, pi.image_url,pi.image_id,u.username, ui.linkedin, ui.instagram
      FROM projects p
      LEFT JOIN project_images pi ON p.project_id = pi.project_id
      LEFT JOIN user_information ui ON p.user_id = ui.user_id
      LEFT JOIN users u ON p.user_id = u.id
      where u.id = ?
    `,
      [req.params.userId]
    );

    const projectsMap = projectsQuery.reduce((map, row) => {
      if (!map.has(row.project_id)) {
        map.set(row.project_id, {
          ...row,
          image_url: row.image_url ? [row.image_url] : [],
          linkedin: row.linkedin,
          instagram: row.instagram,
        });
      } else {
        const project = map.get(row.project_id);
        if (row.image_url) {
          project.image_url.push(row.image_url);
        }
      }
      return map;
    }, new Map());

    const response = Array.from(projectsMap.values());
    return res
      .status(200)
      .json({ status: 'success', data: { projects: response } });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}
export async function createProject(req, res) {
  const { images, linkedin, instagram, ...projectData } = req.body;
  try {
    const [data] = await db.query('INSERT INTO projects SET ?', [projectData]);
    if (linkedin || instagram) {
      await db.query(
        'UPDATE user_information SET linkedin = ?, instagram = ? WHERE user_id = ?',
        [linkedin, instagram, projectData.user_id]
      );
    }

    const projectId = data.insertId;
    if (Array.isArray(images) && images.length > 0) {
      const insertImageQueries = images.map((image) =>
        db.query(
          'INSERT INTO project_images (project_id,image_url) VALUES (?,?)',
          [projectId, image]
        )
      );

      await Promise.all(insertImageQueries);
    } else if (!Array.isArray(images) && images) {
      await db.query(
        'INSERT INTO project_images (project_id, image_url) VALUES (?,?)',
        [projectId, images]
      );
    }

    const { project, images_url } = await getSingleProject(data.insertId);

    return res.status(200).json({
      status: 'success',
      data: { project: { ...project, images: images_url } },
    });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function deleteProject(req, res) {
  try {
    const id = Number(req.params.id);
    await db.query('DELETE FROM project_images WHERE project_id = ?', [id]);
    await db.query('DELETE from projects WHERE project_id = ?', [id]);

    return res
      .status(200)
      .json({ status: 'success', message: 'Successfully delete the project' });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}

export async function updateProject(req, res) {
  const { images, linkedin, instagram, user_id, ...projectData } = req.body;
  try {
    const projectId = Number(req.params.id);
    if (linkedin || instagram) {
      await db.query(
        'UPDATE user_information SET linkedin = ?, instagram = ? WHERE user_id = ?',
        [linkedin, instagram, user_id]
      );
    }
    await db.query('UPDATE projects SET ? WHERE project_id = ?', [
      projectData,
      projectId,
    ]);

    await db.query('DELETE FROM project_images WHERE project_id = ?', [
      projectId,
    ]);

    if (Array.isArray(images) && images.length > 0) {
      images.map((image) =>
        db.query(
          'insert into project_images (project_id,image_url) VALUES (?,?)',
          [projectId, image]
        )
      );
    }

    return res.status(200).json({
      status: 'success',
      message: 'Successfully updated your project',
    });
  } catch (err) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
}
