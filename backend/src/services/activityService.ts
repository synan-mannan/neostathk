import { pool } from '../db/pool.js';
import { emitToProject, emitToUser, emitGlobalActivity } from '../sockets/index.js';

export async function logActivity(
  clientOrPool: any,
  params: {
    userId: string | null;
    projectId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, any>;
  }
) {
  const executor = clientOrPool || pool;
  const res = await executor.query(
    `INSERT INTO activity_logs (user_id, project_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      params.userId,
      params.projectId || null,
      params.action,
      params.entityType,
      params.entityId || null,
      JSON.stringify(params.metadata || {}),
    ]
  );

  const log = res.rows[0];

  // Also query user name for live feed rendering
  if (params.userId) {
    const userRes = await executor.query('SELECT name, email FROM users WHERE id = $1', [params.userId]);
    if (userRes.rows.length > 0) {
      log.user_name = userRes.rows[0].name;
      log.user_email = userRes.rows[0].email;
    }
  }

  // Real-time broadcast
  if (params.projectId) {
    emitToProject(params.projectId, 'activity:created', log);
  }
  emitGlobalActivity('activity:created', log);

  return log;
}

export async function createNotification(
  clientOrPool: any,
  params: {
    userId: string;
    projectId?: string | null;
    type: string;
    message: string;
    entityType: string;
    entityId?: string | null;
  }
) {
  const executor = clientOrPool || pool;
  const res = await executor.query(
    `INSERT INTO notifications (user_id, project_id, type, message, entity_type, entity_id, is_read)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING *`,
    [
      params.userId,
      params.projectId || null,
      params.type,
      params.message,
      params.entityType,
      params.entityId || null,
    ]
  );

  const notif = res.rows[0];

  // Real-time emit to targeted user private room
  emitToUser(params.userId, 'notification:created', notif);

  return notif;
}
