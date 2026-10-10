import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskAssigneeSchema,
} from '../schemas/index.js';
import { logActivity, createNotification } from '../services/activityService.js';
import { emitToProject } from '../sockets/index.js';

// Helper to check user permission on a specific task
async function getTaskContext(taskId: string, userId: string, userGlobalRole: string) {
  const taskRes = await pool.query(
    `SELECT t.*, p.name AS project_name
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1`,
    [taskId]
  );

  if (taskRes.rows.length === 0) return null;
  const task = taskRes.rows[0];

  if (userGlobalRole === 'ADMIN') {
    return { task, projectRole: 'MANAGER', canEdit: true, canDelete: true, canUpdateStatus: true };
  }

  const memberRes = await pool.query(
    'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [task.project_id, userId]
  );

  if (memberRes.rows.length === 0) {
    return { task, projectRole: null, canEdit: false, canDelete: false, canUpdateStatus: false };
  }

  const role = memberRes.rows[0].project_role;
  const isAssignee = task.assignee_id === userId;

  return {
    task,
    projectRole: role,
    canEdit: role === 'MANAGER' || (role === 'MEMBER' && isAssignee),
    canDelete: role === 'MANAGER',
    canUpdateStatus: role === 'MANAGER' || (role === 'MEMBER' && isAssignee),
  };
}

// 1. GET /api/projects/:id/tasks
export async function listProjectTasksHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const { status, priority, assignee_id, search } = req.query;

    let query = `
      SELECT t.*,
        u_assignee.name AS assignee_name,
        u_assignee.email AS assignee_email,
        u_creator.name AS creator_name
      FROM tasks t
      LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
      LEFT JOIN users u_creator ON t.created_by = u_creator.id
      WHERE t.project_id = $1
    `;
    const params: any[] = [projectId];

    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      query += ` AND t.priority = $${params.length}`;
    }

    if (assignee_id) {
      params.push(assignee_id);
      query += ` AND t.assignee_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`;
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, tasks: result.rows });
  } catch (err) {
    next(err);
  }
}

// 2. POST /api/projects/:id/tasks
export async function createTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const user = req.user!;
    const validated = createTaskSchema.parse(req.body);

    // Permission: Admin or Project Manager
    if (user.role !== 'ADMIN') {
      const pmCheck = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, user.id]
      );
      if (pmCheck.rows.length === 0 || pmCheck.rows[0].project_role !== 'MANAGER') {
        res.status(403).json({ success: false, message: 'Forbidden: Only Project Managers or Admins can create tasks' });
        return;
      }
    }

    // If assignee provided, verify assignee is an active project member
    if (validated.assignee_id) {
      const assigneeCheck = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, validated.assignee_id]
      );
      if (assigneeCheck.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Assignee must be a member of the project' });
        return;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
         RETURNING *`,
        [
          projectId,
          validated.title,
          validated.description || '',
          validated.status || 'TODO',
          validated.priority || 'MEDIUM',
          validated.assignee_id || null,
          user.id,
        ]
      );

      const newTask = insertRes.rows[0];

      // Populate user info for socket payload
      let assigneeName = null;
      if (newTask.assignee_id) {
        const uRes = await client.query('SELECT name, email FROM users WHERE id = $1', [newTask.assignee_id]);
        if (uRes.rows.length > 0) {
          assigneeName = uRes.rows[0].name;
          newTask.assignee_name = assigneeName;
          newTask.assignee_email = uRes.rows[0].email;
        }
      }
      newTask.creator_name = user.name;

      await logActivity(client, {
        userId: user.id,
        projectId,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: newTask.id,
        metadata: { title: newTask.title, status: newTask.status, priority: newTask.priority },
      });

      if (validated.assignee_id && validated.assignee_id !== user.id) {
        await createNotification(client, {
          userId: validated.assignee_id,
          projectId,
          type: 'TASK_ASSIGNED',
          message: `You were assigned a new task: "${newTask.title}"`,
          entityType: 'TASK',
          entityId: newTask.id,
        });
      }

      await client.query('COMMIT');

      // Real-time Socket.IO emission
      emitToProject(projectId, 'task:created', newTask);

      res.status(201).json({ success: true, task: newTask });
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

// 3. GET /api/tasks/:id
export async function getTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    const result = await pool.query(
      `SELECT t.*,
        p.name AS project_name,
        u_assignee.name AS assignee_name,
        u_assignee.email AS assignee_email,
        u_creator.name AS creator_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
       LEFT JOIN users u_creator ON t.created_by = u_creator.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const task = result.rows[0];

    // Authorization
    if (user.role !== 'ADMIN') {
      const member = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [task.project_id, user.id]
      );
      if (member.rows.length === 0) {
        res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this task' });
        return;
      }
    }

    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

// 4. PATCH /api/tasks/:id with MANDATORY Optimistic Concurrency Control (version)
export async function updateTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;
    const validated = updateTaskSchema.parse(req.body);

    const ctx = await getTaskContext(id, user.id, user.role);
    if (!ctx) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (!ctx.canEdit) {
      res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to edit this task' });
      return;
    }

    // Prepare fields to update
    const currentTask = ctx.task;
    const title = validated.title !== undefined ? validated.title : currentTask.title;
    const description = validated.description !== undefined ? validated.description : currentTask.description;
    const status = validated.status !== undefined ? validated.status : currentTask.status;
    const priority = validated.priority !== undefined ? validated.priority : currentTask.priority;
    const assigneeId = validated.assignee_id !== undefined ? validated.assignee_id : currentTask.assignee_id;

    // ATOMIC UPDATE with version increment and optimistic concurrency check
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE tasks
         SET title = $1,
             description = $2,
             status = $3,
             priority = $4,
             assignee_id = $5,
             version = version + 1,
             updated_at = NOW()
         WHERE id = $6 AND version = $7
         RETURNING *`,
        [title, description, status, priority, assigneeId, id, validated.version]
      );

      // If no row updated, check if version conflict or missing
      if (updateRes.rows.length === 0) {
        await client.query('ROLLBACK');

        const latestCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (latestCheck.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Task not found' });
          return;
        }

        // Return HTTP 409 Conflict with latest version details
        res.status(409).json({
          success: false,
          message: 'Conflict: This task has been modified by another user. Please review the latest version before retrying.',
          currentTask: latestCheck.rows[0],
          currentVersion: latestCheck.rows[0].version,
          staleVersion: validated.version,
        });
        return;
      }

      const updatedTask = updateRes.rows[0];

      // Fetch assignee and creator names for socket broadcast
      const namesRes = await client.query(
        `SELECT
          u_assignee.name AS assignee_name,
          u_assignee.email AS assignee_email,
          u_creator.name AS creator_name
         FROM tasks t
         LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
         LEFT JOIN users u_creator ON t.created_by = u_creator.id
         WHERE t.id = $1`,
        [id]
      );

      const enrichedTask = { ...updatedTask, ...namesRes.rows[0] };

      // Log activity
      await logActivity(client, {
        userId: user.id,
        projectId: currentTask.project_id,
        action: 'TASK_UPDATED',
        entityType: 'TASK',
        entityId: id,
        metadata: {
          previous: { status: currentTask.status, assignee_id: currentTask.assignee_id },
          updated: { status: updatedTask.status, assignee_id: updatedTask.assignee_id },
        },
      });

      // Notify if status changed or assignee changed
      if (updatedTask.status !== currentTask.status && updatedTask.assignee_id && updatedTask.assignee_id !== user.id) {
        await createNotification(client, {
          userId: updatedTask.assignee_id,
          projectId: currentTask.project_id,
          type: 'TASK_STATUS_CHANGED',
          message: `Task "${updatedTask.title}" status changed to ${updatedTask.status}`,
          entityType: 'TASK',
          entityId: id,
        });
      }

      if (updatedTask.assignee_id !== currentTask.assignee_id && updatedTask.assignee_id && updatedTask.assignee_id !== user.id) {
        await createNotification(client, {
          userId: updatedTask.assignee_id,
          projectId: currentTask.project_id,
          type: 'TASK_ASSIGNED',
          message: `You were assigned task: "${updatedTask.title}"`,
          entityType: 'TASK',
          entityId: id,
        });
      }

      await client.query('COMMIT');

      // Real-time broadcast
      emitToProject(currentTask.project_id, 'task:updated', enrichedTask);

      res.json({ success: true, task: enrichedTask });
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

// 5. PATCH /api/tasks/:id/status
export async function updateTaskStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;
    const validated = updateTaskStatusSchema.parse(req.body);

    const ctx = await getTaskContext(id, user.id, user.role);
    if (!ctx) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (!ctx.canUpdateStatus) {
      res.status(403).json({ success: false, message: 'Forbidden: You cannot change status for this task' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE tasks
         SET status = $1,
             version = version + 1,
             updated_at = NOW()
         WHERE id = $2 AND version = $3
         RETURNING *`,
        [validated.status, id, validated.version]
      );

      if (updateRes.rows.length === 0) {
        await client.query('ROLLBACK');
        const latestCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (latestCheck.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Task not found' });
          return;
        }

        res.status(409).json({
          success: false,
          message: 'Conflict: This task was modified concurrently by another user.',
          currentTask: latestCheck.rows[0],
          currentVersion: latestCheck.rows[0].version,
          staleVersion: validated.version,
        });
        return;
      }

      const updatedTask = updateRes.rows[0];

      await logActivity(client, {
        userId: user.id,
        projectId: ctx.task.project_id,
        action: 'TASK_STATUS_CHANGED',
        entityType: 'TASK',
        entityId: id,
        metadata: { from: ctx.task.status, to: validated.status },
      });

      if (updatedTask.assignee_id && updatedTask.assignee_id !== user.id) {
        await createNotification(client, {
          userId: updatedTask.assignee_id,
          projectId: ctx.task.project_id,
          type: 'TASK_STATUS_CHANGED',
          message: `Task "${updatedTask.title}" status changed to ${validated.status}`,
          entityType: 'TASK',
          entityId: id,
        });
      }

      await client.query('COMMIT');

      emitToProject(ctx.task.project_id, 'task:status_changed', updatedTask);

      res.json({ success: true, task: updatedTask });
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

// 6. PATCH /api/tasks/:id/assignee
export async function updateTaskAssigneeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;
    const validated = updateTaskAssigneeSchema.parse(req.body);

    const ctx = await getTaskContext(id, user.id, user.role);
    if (!ctx) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (user.role !== 'ADMIN' && ctx.projectRole !== 'MANAGER') {
      res.status(403).json({ success: false, message: 'Forbidden: Only Project Managers or Admins can assign tasks' });
      return;
    }

    if (validated.assignee_id) {
      const memberCheck = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [ctx.task.project_id, validated.assignee_id]
      );
      if (memberCheck.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Assignee must be a project member' });
        return;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateRes = await client.query(
        `UPDATE tasks
         SET assignee_id = $1,
             version = version + 1,
             updated_at = NOW()
         WHERE id = $2 AND version = $3
         RETURNING *`,
        [validated.assignee_id, id, validated.version]
      );

      if (updateRes.rows.length === 0) {
        await client.query('ROLLBACK');
        const latestCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (latestCheck.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Task not found' });
          return;
        }

        res.status(409).json({
          success: false,
          message: 'Conflict: Task was modified concurrently by another user.',
          currentTask: latestCheck.rows[0],
          currentVersion: latestCheck.rows[0].version,
          staleVersion: validated.version,
        });
        return;
      }

      const updatedTask = updateRes.rows[0];

      await logActivity(client, {
        userId: user.id,
        projectId: ctx.task.project_id,
        action: 'TASK_ASSIGNED',
        entityType: 'TASK',
        entityId: id,
        metadata: { assignee_id: validated.assignee_id },
      });

      if (validated.assignee_id && validated.assignee_id !== user.id) {
        await createNotification(client, {
          userId: validated.assignee_id,
          projectId: ctx.task.project_id,
          type: 'TASK_ASSIGNED',
          message: `You were assigned task: "${updatedTask.title}"`,
          entityType: 'TASK',
          entityId: id,
        });
      }

      await client.query('COMMIT');

      emitToProject(ctx.task.project_id, 'task:assigned', updatedTask);

      res.json({ success: true, task: updatedTask });
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

// 7. DELETE /api/tasks/:id
export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    const ctx = await getTaskContext(id, user.id, user.role);
    if (!ctx) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (!ctx.canDelete) {
      res.status(403).json({ success: false, message: 'Forbidden: Only Project Managers or Admins can delete tasks' });
      return;
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    await logActivity(pool, {
      userId: user.id,
      projectId: ctx.task.project_id,
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: id,
      metadata: { title: ctx.task.title },
    });

    emitToProject(ctx.task.project_id, 'task:deleted', { id, projectId: ctx.task.project_id });

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
}
