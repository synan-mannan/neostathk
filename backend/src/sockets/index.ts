import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { env } from '../config/env.js';
import { verifyJwtToken } from '../services/authService.js';
import { pool } from '../db/pool.js';

let ioInstance: Server | null = null;

export function initSocketIO(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Authenticate socket connection via cookie or auth handshake token
  io.use(async (socket: Socket, next) => {
    try {
      let token: string | undefined;

      // 1. Check cookies
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const parsedCookies = cookie.parse(cookieHeader);
        token = parsedCookies[env.COOKIE_NAME];
      }

      // 2. Check auth token in handshake query or auth object
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        return next(new Error('Authentication error: No session token found'));
      }

      const decodedUser = verifyJwtToken(token);
      if (!decodedUser) {
        return next(new Error('Authentication error: Invalid or expired session token'));
      }

      // Fetch fresh user record from DB to verify active status
      const userRes = await pool.query(
        'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
        [decodedUser.id]
      );

      if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
        return next(new Error('Authentication error: User inactive or not found'));
      }

      (socket as any).user = userRes.rows[0];
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(` Socket connected: ${user.name} (${user.id})`);

    // Join personal user room for private notifications
    socket.join(`user:${user.id}`);

    // Handle project room subscription with server-side authorization check
    socket.on('subscribe:project', async (projectId: string, callback?: (res: any) => void) => {
      try {
        if (!projectId) return;

        // Admins can view any project room
        if (user.role === 'ADMIN') {
          socket.join(`project:${projectId}`);
          if (callback) callback({ success: true, room: `project:${projectId}` });
          return;
        }

        // Check if user is a member of this project
        const memberRes = await pool.query(
          'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
          [projectId, user.id]
        );

        if (memberRes.rows.length > 0) {
          socket.join(`project:${projectId}`);
          if (callback) callback({ success: true, room: `project:${projectId}` });
        } else {
          console.warn(` User ${user.email} denied subscription to unauthorized project room ${projectId}`);
          if (callback) callback({ success: false, message: 'Unauthorized project subscription' });
        }
      } catch (err) {
        console.error('Error subscribing to project room:', err);
        if (callback) callback({ success: false, message: 'Internal error' });
      }
    });

    socket.on('unsubscribe:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log(` Socket disconnected: ${user.name}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): Server | null {
  return ioInstance;
}

// Helpers to emit events to project or user
export function emitToProject(projectId: string, event: string, payload: any) {
  if (ioInstance) {
    ioInstance.to(`project:${projectId}`).emit(event, payload);
  }
}

export function emitToUser(userId: string, event: string, payload: any) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
}

export function emitGlobalActivity(event: string, payload: any) {
  if (ioInstance) {
    ioInstance.emit(event, payload);
  }
}
