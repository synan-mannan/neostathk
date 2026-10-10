import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { verifyJwtToken, getUserById } from '../services/authService.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies[env.COOKIE_NAME]) {
      token = req.cookies[env.COOKIE_NAME];
    }

    // 2. Fallback to Authorization header Bearer token
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    const payload = verifyJwtToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
      return;
    }

    // Server-side authoritative verification
    const user = await getUserById(payload.id);
    if (!user || !user.is_active) {
      res.status(401).json({
        success: false,
        message: 'User account is inactive or no longer exists.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
