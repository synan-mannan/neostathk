import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool.js';

type GlobalRole = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'VIEWER';
type ProjectRole = 'MANAGER' | 'MEMBER' | 'VIEWER';

// Global role authorization
export function requireGlobalRoles(...roles: GlobalRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${roles.join(', ')}] role`,
      });
      return;
    }

    next();
  };
}

// Helper to determine user project access
export async function getProjectMembership(projectId: string, userId: string): Promise<ProjectRole | null> {
  const res = await pool.query(
    'SELECT project_role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );

  if (res.rows.length === 0) return null;
  return res.rows[0].project_role as ProjectRole;
}

// Require project access with minimum allowed role
// Admin always bypasses project level checks.
// Allowed roles order: MANAGER > MEMBER > VIEWER
export function requireProjectRole(minRole: ProjectRole = 'VIEWER') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      // Admin has full system access
      if (req.user.role === 'ADMIN') {
        return next();
      }

      const projectId = req.params.projectId || req.params.id;
      if (!projectId) {
        res.status(400).json({ success: false, message: 'Project ID parameter is missing' });
        return;
      }

      // Check if project exists
      const projCheck = await pool.query('SELECT id, status FROM projects WHERE id = $1', [projectId]);
      if (projCheck.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Project not found' });
        return;
      }

      const userRole = await getProjectMembership(projectId, req.user.id);
      if (!userRole) {
        res.status(403).json({ success: false, message: 'Forbidden: You are not a member of this project' });
        return;
      }

      const roleHierarchy: Record<ProjectRole, number> = {
        VIEWER: 1,
        MEMBER: 2,
        MANAGER: 3,
      };

      if (roleHierarchy[userRole] < roleHierarchy[minRole]) {
        res.status(403).json({
          success: false,
          message: `Forbidden: Project role ${minRole} required, but you have ${userRole}`,
        });
        return;
      }

      (req as any).projectRole = userRole;
      next();
    } catch (err) {
      next(err);
    }
  };
}
