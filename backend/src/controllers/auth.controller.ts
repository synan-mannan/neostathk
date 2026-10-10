import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { loginSchema, registerSchema } from '../schemas/index.js';
import { loginUser, signJwtToken } from '../services/authService.js';
import { pool } from '../db/pool.js';
import { logActivity } from '../services/activityService.js';

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = registerSchema.parse(req.body);

    // Check if email already registered
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [validated.email]);
    if (existing.rows.length > 0) {
      res.status(400).json({
        success: false,
        message: 'A user with this email address already exists',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Default role for new self-registered users is VIEWER until Admin modifies it
    const defaultRole = 'VIEWER';

    const insertRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, role, is_active, created_at, updated_at`,
      [validated.name, validated.email, passwordHash, defaultRole]
    );

    const newUser = insertRes.rows[0];

    // Automatically authenticate the new user with an HttpOnly session cookie
    const token = signJwtToken(newUser);

    res.cookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    await logActivity(pool, {
      userId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: newUser.id,
      metadata: { email: newUser.email, assigned_initial_role: defaultRole },
    });

    res.status(201).json({
      success: true,
      message: 'Account registered and logged in successfully. Role set to Viewer pending Admin assignment.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        is_active: newUser.is_active,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = loginSchema.parse(req.body);
    const user = await loginUser(validated.email, validated.password);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const token = signJwtToken(user);

    // Set secure HttpOnly cookie
    res.cookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    res.json({
      success: true,
      message: 'Logged in successfully',
      user,
      token, // Also return token for clients or WebSocket handshakes
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return;
  }

  res.json({
    success: true,
    user: req.user,
  });
}
