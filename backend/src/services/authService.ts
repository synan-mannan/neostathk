import jwt, { type JwtPayload, type Secret, type SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getUserByEmail, getUserById, users } from "../db/mockDb.js";
import { env } from "../config/env.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER" | "VIEWER";
  is_active: boolean;
}

export function signToken(user: AuthenticatedUser): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
    },
    env.JWT_SECRET as Secret,
    options,
  );
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET as Secret) as JwtPayload & {
      sub?: string;
      email?: string;
      name?: string;
      role?: AuthenticatedUser["role"];
      is_active?: boolean;
    };

    if (!payload.sub || !payload.email) {
      return null;
    }

    const user = getUserById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.isActive,
    };
  } catch {
    return null;
  }
}

export async function loginUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  const user = getUserByEmail(email);
  if (!user || !user.isActive) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    is_active: user.isActive,
  };
}

export function listUsers(): Omit<AuthenticatedUser, "is_active">[] {
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }));
}
