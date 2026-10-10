import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';
import { createCommentSchema } from '../schemas/index.js';
import { logActivity, createNotification } from '../services/activityService.js';
import { emitToProject } from '../sockets/index.js';

// 1. GET /api/tasks/:id/comments
export async function listTaskCommentsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: taskId } = req.params;
    const user = req.user!;

    // Check task existence and project membership
    const taskRes = await pool.query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
    if (taskRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const projectId = taskRes.rows[0].project_id;
    if (user.role !== 'ADMIN') {
      const member = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, user.id]
      );
      if (member.rows.length === 0) {
        res.status(403).json({ success: false, message: 'Forbidden: You do not belong to this project' });
        return;
      }
    }

    const result = await pool.query(
      `SELECT c.*, u.name AS user_name, u.email AS user_email
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1
       ORDER BY c.created_at ASC`,
      [taskId]
    );

    res.json({ success: true, comments: result.rows });
  } catch (err) {
    next(err);
  }
}

// 2. POST /api/tasks/:id/comments
export async function createCommentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: taskId } = req.params;
    const user = req.user!;
    const validated = createCommentSchema.parse(req.body);

    const taskRes = await pool.query('SELECT id, project_id, title, assignee_id FROM tasks WHERE id = $1', [taskId]);
    if (taskRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    const task = taskRes.rows[0];

    // Viewer role check: Viewers cannot comment
    if (user.role !== 'ADMIN') {
      const member = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [task.project_id, user.id]
      );
      if (member.rows.length === 0) {
        res.status(403).json({ success: false, message: 'Forbidden: You do not belong to this project' });
        return;
      }
      if (member.rows[0].project_role === 'VIEWER') {
        res.status(403).json({ success: false, message: 'Forbidden: Viewers have read-only access and cannot add comments' });
        return;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRes = await client.query(
        `INSERT INTO comments (task_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [taskId, user.id, validated.content]
      );

      const comment = {
        ...insertRes.rows[0],
        user_name: user.name,
        user_email: user.email,
      };

      await logActivity(client, {
        userId: user.id,
        projectId: task.project_id,
        action: 'COMMENT_CREATED',
        entityType: 'COMMENT',
        entityId: comment.id,
        metadata: { taskId, taskTitle: task.title },
      });

      // Notify task assignee if someone else comments
      if (task.assignee_id && task.assignee_id !== user.id) {
        await createNotification(client, {
          userId: task.assignee_id,
          projectId: task.project_id,
          type: 'TASK_COMMENT_ADDED',
          message: `${user.name} commented on "${task.title}"`,
          entityType: 'TASK',
          entityId: taskId,
        });
      }

      await client.query('COMMIT');

      // Real-time broadcast to project room
      emitToProject(task.project_id, 'comment:created', comment);

      res.status(201).json({ success: true, comment });
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

// 3. DELETE /api/comments/:id
export async function deleteCommentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    const commentRes = await pool.query(
      `SELECT c.*, t.project_id
       FROM comments c
       JOIN tasks t ON c.task_id = t.id
       WHERE c.id = $1`,
      [id]
    );

    if (commentRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }

    const comment = commentRes.rows[0];

    // Only Admin, Project Manager, or the comment author can delete
    if (user.role !== 'ADMIN' && comment.user_id !== user.id) {
      const pmCheck = await pool.query(
        'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [comment.project_id, user.id]
      );
      if (pmCheck.rows.length === 0 || pmCheck.rows[0].project_role !== 'MANAGER') {
        res.status(403).json({ success: false, message: 'Forbidden: You cannot delete this comment' });
        return;
      }
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);

    await logActivity(pool, {
      userId: user.id,
      projectId: comment.project_id,
      action: 'COMMENT_DELETED',
      entityType: 'COMMENT',
      entityId: id,
    });

    emitToProject(comment.project_id, 'comment:deleted', { id, taskId: comment.task_id });

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
}
