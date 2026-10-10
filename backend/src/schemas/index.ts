import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// User Schemas
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER', 'VIEWER']).optional(),
  is_active: z.boolean().optional(),
});

// Project Schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional().default(''),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name cannot be empty').optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

// Project Member Schemas
export const addProjectMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user UUID'),
  project_role: z.enum(['MANAGER', 'MEMBER', 'VIEWER']),
});

export const updateProjectMemberSchema = z.object({
  project_role: z.enum(['MANAGER', 'MEMBER', 'VIEWER']),
});

// Task Schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().default(''),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional().default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  assignee_id: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title cannot be empty').optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  version: z.number().int({ message: 'Task version is required for optimistic locking' }),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  version: z.number().int({ message: 'Task version is required for optimistic locking' }),
});

export const updateTaskAssigneeSchema = z.object({
  assignee_id: z.string().uuid().nullable(),
  version: z.number().int({ message: 'Task version is required for optimistic locking' }),
});

// Comment Schemas
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty'),
});
