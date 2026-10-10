import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { loginSchema } from '../schemas/index.js';
import { loginUser, signJwtToken } from '../services/authService.js';

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
