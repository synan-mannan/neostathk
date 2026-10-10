import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberSchema,
} from '../schemas/index.js';
import { logActivity, createNotification } from '../services/activityService.js';
import { emitToProject } from '../sockets/index.js';

export async function listProjectsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { status, search } = req.query;

    let query: string;
    const params: any[] = [];

    if (user.role === 'ADMIN') {
      // Admins see all projects
      query = `
        SELECT p.*,
          u.name AS creator_name,
          (SELECT count(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
          (SELECT count(*)::int FROM tasks t WHERE t.project_id = p.id) AS task_count
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE 1=1
      `;
    } else {
      // Non-admins see only projects they belong to
      query = `
        SELECT p.*,
          u.name AS creator_name,
          pm_user.project_role AS user_project_role,
          (SELECT count(*)::int FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
          (SELECT count(*)::int FROM tasks t WHERE t.project_id = p.id) AS task_count
        FROM projects p
        JOIN project_members pm_user ON pm_user.project_id = p.id AND pm_user.user_id = $1
        LEFT JOIN users u ON p.created_by = u.id
        WHERE 1=1
      `;
      params.push(user.id);
    }

    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, projects: result.rows });
  } catch (err) {
    next(err);
  }
}

export async function getProjectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Check project existence
    const projRes = await pool.query(
      `SELECT p.*, u.name AS creator_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (projRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    // Role check
    let userProjectRole: string | null = null;
    if (user.role === 'ADMIN') {
      userProjectRole = 'ADMIN';
    } else {
      const memberRes = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [id, user.id]
      );
      if (memberRes.rows.length === 0) {
        res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to view this project' });
        return;
      }
      userProjectRole = memberRes.rows[0].project_role;
    }

    // Fetch member summary
    const membersRes = await pool.query(
      `SELECT pm.project_role, pm.joined_at, u.id, u.name, u.email, u.role AS global_role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [id]
    );

    // Fetch task summary metrics
    const taskStats = await pool.query(
      `SELECT status, count(*)::int as count FROM tasks WHERE project_id = $1 GROUP BY status`,
      [id]
    );

    res.json({
      success: true,
      project: {
        ...projRes.rows[0],
        currentUserRole: userProjectRole,
        members: membersRes.rows,
        taskStats: taskStats.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createProjectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    // Only Admin can create projects
    if (user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Only Admins can create new projects' });
      return;
    }

    const validated = createProjectSchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const projRes = await client.query(
        `INSERT INTO projects (name, description, status, created_by)
         VALUES ($1, $2, 'ACTIVE', $3)
         RETURNING *`,
        [validated.name, validated.description, user.id]
      );

      const newProj = projRes.rows[0];

      await logActivity(client, {
        userId: user.id,
        projectId: newProj.id,
        action: 'PROJECT_CREATED',
        entityType: 'PROJECT',
        entityId: newProj.id,
        metadata: { name: newProj.name },
      });

      await client.query('COMMIT');
      res.status(201).json({ success: true, project: newProj });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

export async function updateProjectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;
    const validated = updateProjectSchema.parse(req.body);

    // Authorization: Admin or Project Manager of this project
    if (user.role !== 'ADMIN') {
      const member = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [id, user.id]
      );
      if (member.rows.length === 0 || member.rows[0].project_role !== 'MANAGER') {
        res.status(403).json({ success: false, message: 'Only Admins or Project Managers can edit project details' });
        return;
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      values.push(validated.name);
      updates.push(`name = $${values.length}`);
    }

    if (validated.description !== undefined) {
      values.push(validated.description);
      updates.push(`description = $${values.length}`);
    }

    if (validated.status !== undefined) {
      values.push(validated.status);
      updates.push(`status = $${values.length}`);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: 'No fields provided for update' });
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE projects SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    const updated = result.rows[0];

    await logActivity(pool, {
      userId: user.id,
      projectId: id,
      action: 'PROJECT_UPDATED',
      entityType: 'PROJECT',
      entityId: id,
      metadata: { changed: Object.keys(validated) },
    });

    res.json({ success: true, project: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Forbidden: Only Admins can permanently delete projects' });
      return;
    }

    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING name', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    await logActivity(pool, {
      userId: user.id,
      action: 'PROJECT_DELETED',
      entityType: 'PROJECT',
      entityId: id,
      metadata: { name: result.rows[0].name },
    });

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function archiveProjectHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role !== 'ADMIN') {
      const member = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [id, user.id]
      );
      if (member.rows.length === 0 || member.rows[0].project_role !== 'MANAGER') {
        res.status(403).json({ success: false, message: 'Forbidden: Project Manager or Admin required to archive' });
        return;
      }
    }

    const result = await pool.query(
      "UPDATE projects SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Project not found' });
      return;
    }

    await logActivity(pool, {
      userId: user.id,
      projectId: id,
      action: 'PROJECT_ARCHIVED',
      entityType: 'PROJECT',
      entityId: id,
    });

    res.json({ success: true, message: 'Project archived', project: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ---------------- Members Controller Handlers ----------------

export async function listProjectMembersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const members = await pool.query(
      `SELECT pm.project_role, pm.joined_at, u.id, u.name, u.email, u.role AS global_role, u.is_active
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at ASC`,
      [id]
    );

    res.json({ success: true, members: members.rows });
  } catch (err) {
    next(err);
  }
}

export async function addProjectMemberHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const user = req.user!;
    const validated = addProjectMemberSchema.parse(req.body);

    // Authorization: Admin or Project Manager
    if (user.role !== 'ADMIN') {
      const pmCheck = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, user.id]
      );
      if (pmCheck.rows.length === 0 || pmCheck.rows[0].project_role !== 'MANAGER') {
        res.status(403).json({ success: false, message: 'Forbidden: Manager role required to add project members' });
        return;
      }
    }

    // Verify target user exists
    const targetUser = await pool.query('SELECT id, name, email, is_active FROM users WHERE id = $1', [
      validated.user_id,
    ]);
    if (targetUser.rows.length === 0 || !targetUser.rows[0].is_active) {
      res.status(400).json({ success: false, message: 'Target user does not exist or is inactive' });
      return;
    }

    const insertRes = await pool.query(
      `INSERT INTO project_members (project_id, user_id, project_role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE
       SET project_role = EXCLUDED.project_role
       RETURNING *`,
      [projectId, validated.user_id, validated.project_role]
    );

    const memberRecord = {
      ...insertRes.rows[0],
      name: targetUser.rows[0].name,
      email: targetUser.rows[0].email,
    };

    // Real-time Socket.IO notification and event
    emitToProject(projectId, 'project:member_added', memberRecord);

    await logActivity(pool, {
      userId: user.id,
      projectId,
      action: 'MEMBER_ADDED',
      entityType: 'PROJECT_MEMBER',
      entityId: validated.user_id,
      metadata: { targetUser: targetUser.rows[0].name, role: validated.project_role },
    });

    await createNotification(pool, {
      userId: validated.user_id,
      projectId,
      type: 'PROJECT_MEMBER_ADDED',
      message: `You were added to project as ${validated.project_role}`,
      entityType: 'PROJECT',
      entityId: projectId,
    });

    res.status(201).json({ success: true, member: memberRecord });
  } catch (err) {
    next(err);
  }
}

export async function updateProjectMemberRoleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId, userId } = req.params;
    const user = req.user!;
    const validated = updateProjectMemberSchema.parse(req.body);

    if (user.role !== 'ADMIN') {
      const pmCheck = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, user.id]
      );
      if (pmCheck.rows.length === 0 || pmCheck.rows[0].project_role !== 'MANAGER') {
        res.status(403).json({ success: false, message: 'Forbidden: Manager role required' });
        return;
      }
    }

    const result = await pool.query(
      `UPDATE project_members
       SET project_role = $1
       WHERE project_id = $2 AND user_id = $3
       RETURNING *`,
      [validated.project_role, projectId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Member not found in project' });
      return;
    }

    emitToProject(projectId, 'project:member_updated', result.rows[0]);

    await createNotification(pool, {
      userId,
      projectId,
      type: 'PROJECT_ROLE_CHANGED',
      message: `Your project role was changed to ${validated.project_role}`,
      entityType: 'PROJECT',
      entityId: projectId,
    });

    res.json({ success: true, member: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function removeProjectMemberHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId, userId } = req.params;
    const user = req.user!;

    if (user.role !== 'ADMIN') {
      const pmCheck = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, user.id]
      );
      if (pmCheck.rows.length === 0 || pmCheck.rows[0].project_role !== 'MANAGER') {
        res.status(403).json({ success: false, message: 'Forbidden: Manager role required' });
        return;
      }
    }

    const result = await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Member not found in project' });
      return;
    }

    emitToProject(projectId, 'project:member_removed', { projectId, userId });

    await logActivity(pool, {
      userId: user.id,
      projectId,
      action: 'MEMBER_REMOVED',
      entityType: 'PROJECT_MEMBER',
      entityId: userId,
    });

    await createNotification(pool, {
      userId,
      projectId,
      type: 'PROJECT_MEMBER_REMOVED',
      message: 'You have been removed from the project',
      entityType: 'PROJECT',
      entityId: projectId,
    });

    res.json({ success: true, message: 'Member removed from project' });
  } catch (err) {
    next(err);
  }
}
