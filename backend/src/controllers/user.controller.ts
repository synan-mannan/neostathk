import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';
import { createUserSchema, updateUserSchema } from '../schemas/index.js';
import { logActivity } from '../services/activityService.js';

export async function listUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, is_active } = req.query;
    let query = 'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);
    res.json({
      success: true,
      users: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = createUserSchema.parse(req.body);

    // Check duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [validated.email]);
    if (existing.rows.length > 0) {
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, role, is_active, created_at, updated_at`,
      [validated.name, validated.email, passwordHash, validated.role]
    );

    const newUser = result.rows[0];

    await logActivity(pool, {
      userId: req.user!.id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: newUser.id,
      metadata: { email: newUser.email, role: newUser.role, name: newUser.name },
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const validated = updateUserSchema.parse(req.body);

    const targetUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (targetUser.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      values.push(validated.name);
      updates.push(`name = $${values.length}`);
    }

    if (validated.email !== undefined) {
      // Check duplicate
      const dup = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2', [
        validated.email,
        id,
      ]);
      if (dup.rows.length > 0) {
        res.status(400).json({ success: false, message: 'Email is already in use by another user' });
        return;
      }
      values.push(validated.email);
      updates.push(`email = $${values.length}`);
    }

    if (validated.password !== undefined) {
      const passwordHash = await bcrypt.hash(validated.password, 10);
      values.push(passwordHash);
      updates.push(`password_hash = $${values.length}`);
    }

    if (validated.role !== undefined) {
      values.push(validated.role);
      updates.push(`role = $${values.length}`);
    }

    if (validated.is_active !== undefined) {
      values.push(validated.is_active);
      updates.push(`is_active = $${values.length}`);
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, message: 'No fields provided for update' });
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, name, email, role, is_active, created_at, updated_at`;
    const result = await pool.query(query, values);
    const updated = result.rows[0];

    await logActivity(pool, {
      userId: req.user!.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: updated.id,
      metadata: { changed: Object.keys(validated) },
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
}

export async function deactivateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (req.user!.id === id) {
      res.status(400).json({ success: false, message: 'Cannot deactivate your own admin account' });
      return;
    }

    const result = await pool.query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, role, is_active`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await logActivity(pool, {
      userId: req.user!.id,
      action: 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: id,
      metadata: { target_email: result.rows[0].email },
    });

    res.json({ success: true, message: 'User deactivated successfully', user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
