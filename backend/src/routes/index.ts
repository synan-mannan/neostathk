import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireGlobalRoles } from '../middleware/authorize.js';

// Controllers
import { loginHandler, logoutHandler, meHandler } from '../controllers/auth.controller.js';
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deactivateUserHandler,
} from '../controllers/user.controller.js';
import {
  listProjectsHandler,
  createProjectHandler,
  getProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
  archiveProjectHandler,
  listProjectMembersHandler,
  addProjectMemberHandler,
  updateProjectMemberRoleHandler,
  removeProjectMemberHandler,
} from '../controllers/project.controller.js';
import {
  listProjectTasksHandler,
  createTaskHandler,
  getTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  updateTaskStatusHandler,
  updateTaskAssigneeHandler,
} from '../controllers/task.controller.js';
import {
  listTaskCommentsHandler,
  createCommentHandler,
  deleteCommentHandler,
} from '../controllers/comment.controller.js';
import {
  listProjectActivityHandler,
  listGlobalActivityHandler,
  listNotificationsHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
} from '../controllers/activity.controller.js';

const router = Router();

// 1. Authentication Endpoints
router.post('/auth/login', loginHandler);
router.post('/auth/logout', logoutHandler);
router.get('/auth/me', authenticate, meHandler);

// 2. Users Endpoints (Admin only)
router.get('/users', authenticate, requireGlobalRoles('ADMIN'), listUsersHandler);
router.post('/users', authenticate, requireGlobalRoles('ADMIN'), createUserHandler);
router.get('/users/:id', authenticate, requireGlobalRoles('ADMIN'), getUserHandler);
router.patch('/users/:id', authenticate, requireGlobalRoles('ADMIN'), updateUserHandler);
router.patch('/users/:id/deactivate', authenticate, requireGlobalRoles('ADMIN'), deactivateUserHandler);

// 3. Projects Endpoints
router.get('/projects', authenticate, listProjectsHandler);
router.post('/projects', authenticate, createProjectHandler);
router.get('/projects/:id', authenticate, getProjectHandler);
router.patch('/projects/:id', authenticate, updateProjectHandler);
router.delete('/projects/:id', authenticate, deleteProjectHandler);
router.patch('/projects/:id/archive', authenticate, archiveProjectHandler);

// 4. Project Members Endpoints
router.get('/projects/:id/members', authenticate, listProjectMembersHandler);
router.post('/projects/:id/members', authenticate, addProjectMemberHandler);
router.patch('/projects/:id/members/:userId', authenticate, updateProjectMemberRoleHandler);
router.delete('/projects/:id/members/:userId', authenticate, removeProjectMemberHandler);

// 5. Tasks Endpoints
router.get('/projects/:id/tasks', authenticate, listProjectTasksHandler);
router.post('/projects/:id/tasks', authenticate, createTaskHandler);
router.get('/tasks/:id', authenticate, getTaskHandler);
router.patch('/tasks/:id', authenticate, updateTaskHandler);
router.delete('/tasks/:id', authenticate, deleteTaskHandler);
router.patch('/tasks/:id/status', authenticate, updateTaskStatusHandler);
router.patch('/tasks/:id/assignee', authenticate, updateTaskAssigneeHandler);

// 6. Comments Endpoints
router.get('/tasks/:id/comments', authenticate, listTaskCommentsHandler);
router.post('/tasks/:id/comments', authenticate, createCommentHandler);
router.delete('/comments/:id', authenticate, deleteCommentHandler);

// 7. Activity Endpoints
router.get('/projects/:id/activity', authenticate, listProjectActivityHandler);
router.get('/activity', authenticate, requireGlobalRoles('ADMIN'), listGlobalActivityHandler);

// 8. Notifications Endpoints
router.get('/notifications', authenticate, listNotificationsHandler);
router.patch('/notifications/:id/read', authenticate, markNotificationReadHandler);
router.patch('/notifications/read-all', authenticate, markAllNotificationsReadHandler);

export const apiRouter = router;
