import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';

// 1. GET /api/projects/:id/activity
export async function listProjectActivityHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const user = req.user!;

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
      `SELECT a.*, u.name AS user_name, u.email AS user_email
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.project_id = $1
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [projectId]
    );

    res.json({ success: true, activities: result.rows });
  } catch (err) {
    next(err);
  }
}

// 2. GET /api/activity (Admin only)
export async function listGlobalActivityHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT a.*, u.name AS user_name, u.email AS user_email, p.name AS project_name
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN projects p ON a.project_id = p.id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );

    res.json({ success: true, activities: result.rows });
  } catch (err) {
    next(err);
  }
}

// 3. GET /api/notifications
export async function listNotificationsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const unreadCountRes = await pool.query(
      'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [user.id]
    );

    res.json({
      success: true,
      notifications: result.rows,
      unreadCount: unreadCountRes.rows[0].count,
    });
  } catch (err) {
    next(err);
  }
}

// 4. PATCH /api/notifications/:id/read
export async function markNotificationReadHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const user = req.user!;

    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.json({ success: true, notification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// 5. PATCH /api/notifications/read-all
export async function markAllNotificationsReadHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [user.id]);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}
