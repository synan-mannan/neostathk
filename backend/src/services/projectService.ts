import { getProjectById, projects, users } from "../db/mockDb.js";
import type { ProjectRole } from "../db/mockDb.js";

export function canManageProject(userId: string, projectId: string): boolean {
  const project = getProjectById(projectId);
  if (!project) return false;

  if (project.ownerId === userId) return true;

  const membership = project.members.find((member) => member.userId === userId);
  return membership?.role === "MANAGER";
}

export function canViewProject(userId: string, projectId: string): boolean {
  const project = getProjectById(projectId);
  if (!project) return false;

  if (project.ownerId === userId) return true;
  return project.members.some((member) => member.userId === userId);
}

export function getProjectMembershipRole(userId: string, projectId: string): ProjectRole | null {
  const project = getProjectById(projectId);
  if (!project) return null;

  const membership = project.members.find((member) => member.userId === userId);
  return membership?.role ?? null;
}

export function listProjectsForUser(userId: string) {
  return projects
    .filter((project) => project.ownerId === userId || project.members.some((member) => member.userId === userId))
    .map((project) => ({
      ...project,
      memberCount: project.members.length,
      owner: users.find((user) => user.id === project.ownerId),
    }));
}

export function getProjectDetail(projectId: string) {
  const project = getProjectById(projectId);
  if (!project) return null;

  return {
    ...project,
    members: project.members.map((member) => ({
      ...member,
      user: users.find((user) => user.id === member.userId),
    })),
  };
}
