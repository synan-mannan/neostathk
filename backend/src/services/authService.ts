import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER';
  is_active: boolean;
}

export function signJwtToken(user: AuthenticatedUser): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
    },
    env.JWT_SECRET as Secret,
    options
  );
}

export function verifyJwtToken(token: string): { id: string; email: string; role: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET as Secret) as JwtPayload & {
      sub?: string;
      email?: string;
      role?: string;
    };

    if (!payload.sub || !payload.email) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'VIEWER',
    };
  } catch {
    return null;
  }
}

export async function loginUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  const res = await pool.query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const user = res.rows[0];

  if (!user.is_active) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
  };
}

export async function getUserById(id: string): Promise<AuthenticatedUser | null> {
  const res = await pool.query(
    'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
    [id]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
  };
}
