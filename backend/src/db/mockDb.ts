import bcrypt from "bcrypt";

export type UserRole = "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER" | "VIEWER";
export type ProjectRole = "MANAGER" | "MEMBER" | "VIEWER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
}

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED";
  ownerId: string;
  createdAt: string;
  members: ProjectMember[];
}

export interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: "project" | "task" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  projectId?: string;
  userId: string;
  type: "created" | "updated" | "commented" | "assigned" | "archived";
  message: string;
  createdAt: string;
}

export const users: User[] = [
  {
    id: "user-admin",
    email: "admin@neostats.io",
    name: "Alicia Shaw",
    passwordHash: bcrypt.hashSync("admin123", 10),
    role: "ADMIN",
    isActive: true,
  },
  {
    id: "user-pm",
    email: "pm@neostats.io",
    name: "Marcus Lee",
    passwordHash: bcrypt.hashSync("pm123456", 10),
    role: "PROJECT_MANAGER",
    isActive: true,
  },
  {
    id: "user-swe",
    email: "swe@neostats.io",
    name: "Priya Nair",
    passwordHash: bcrypt.hashSync("swe123456", 10),
    role: "TEAM_MEMBER",
    isActive: true,
  },
  {
    id: "user-viewer",
    email: "viewer@neostats.io",
    name: "Jordan Miles",
    passwordHash: bcrypt.hashSync("viewer123", 10),
    role: "VIEWER",
    isActive: true,
  },
];

export const projects: Project[] = [
  {
    id: "project-launch",
    name: "Launch Readiness",
    description: "Shipping the Q3 analytics launch and onboarding the first customer cohort.",
    status: "ACTIVE",
    ownerId: "user-pm",
    createdAt: "2025-01-10T09:00:00.000Z",
    members: [
      { userId: "user-pm", role: "MANAGER", joinedAt: "2025-01-10T09:00:00.000Z" },
      { userId: "user-swe", role: "MEMBER", joinedAt: "2025-01-10T10:30:00.000Z" },
      { userId: "user-viewer", role: "VIEWER", joinedAt: "2025-01-10T11:10:00.000Z" },
    ],
  },
  {
    id: "project-ops",
    name: "Operations Cleanup",
    description: "Improve incident response and reduce time-to-resolution for backlog issues.",
    status: "PLANNING",
    ownerId: "user-admin",
    createdAt: "2025-01-09T12:00:00.000Z",
    members: [
      { userId: "user-admin", role: "MANAGER", joinedAt: "2025-01-09T12:00:00.000Z" },
      { userId: "user-pm", role: "MEMBER", joinedAt: "2025-01-09T13:00:00.000Z" },
    ],
  },
];

export const tasks: TaskItem[] = [
  {
    id: "task-1",
    projectId: "project-launch",
    title: "Finalize rollout checklist",
    description: "Confirm all launch blockers, owners, and final sign-offs before Friday.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assigneeId: "user-pm",
    dueDate: "2025-01-18",
    version: 1,
    createdAt: "2025-01-10T09:15:00.000Z",
    updatedAt: "2025-01-12T14:00:00.000Z",
  },
  {
    id: "task-2",
    projectId: "project-launch",
    title: "QA regression sweep",
    description: "Run the cross-browser regression suite for the onboarding flow and capture issues.",
    status: "TODO",
    priority: "MEDIUM",
    assigneeId: "user-swe",
    dueDate: "2025-01-20",
    version: 1,
    createdAt: "2025-01-12T09:00:00.000Z",
    updatedAt: "2025-01-12T09:00:00.000Z",
  },
  {
    id: "task-3",
    projectId: "project-ops",
    title: "Define response playbooks",
    description: "Document TTI/TTR and identify escalation thresholds for support alerts.",
    status: "REVIEW",
    priority: "HIGH",
    assigneeId: "user-admin",
    dueDate: "2025-01-22",
    version: 2,
    createdAt: "2025-01-11T08:30:00.000Z",
    updatedAt: "2025-01-14T10:00:00.000Z",
  },
];

export const notifications: NotificationItem[] = [
  {
    id: "note-1",
    userId: "user-swe",
    type: "task",
    title: "Task assigned",
    message: "You were assigned QA regression sweep.",
    read: false,
    createdAt: "2025-01-12T09:30:00.000Z",
  },
  {
    id: "note-2",
    userId: "user-pm",
    type: "project",
    title: "Project update",
    message: "Launch Readiness now has 2 open dependencies.",
    read: true,
    createdAt: "2025-01-13T12:00:00.000Z",
  },
];

export const activity: ActivityItem[] = [
  {
    id: "act-1",
    projectId: "project-launch",
    userId: "user-pm",
    type: "updated",
    message: "Updated launch checklist and assigned final ownerships.",
    createdAt: "2025-01-12T14:00:00.000Z",
  },
  {
    id: "act-2",
    projectId: "project-launch",
    userId: "user-swe",
    type: "commented",
    message: "Left a comment on QA regression sweep after finishing the smoke pass.",
    createdAt: "2025-01-13T11:00:00.000Z",
  },
];

export function getUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string): User | undefined {
  return users.find((user) => user.id === id);
}

export function getProjectById(id: string): Project | undefined {
  return projects.find((project) => project.id === id);
}

export function getTaskById(id: string): TaskItem | undefined {
  return tasks.find((task) => task.id === id);
}
