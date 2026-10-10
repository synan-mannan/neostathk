import { getProjectById, getTaskById, tasks } from "../db/mockDb.js";

export function listProjectTasks(projectId: string) {
  return tasks.filter((task) => task.projectId === projectId);
}

export function getProjectTask(projectId: string, taskId: string) {
  const task = getTaskById(taskId);
  if (!task || task.projectId !== projectId) {
    return null;
  }

  return task;
}

export function ensureTaskVersion(taskId: string, incomingVersion: number): boolean {
  const task = getTaskById(taskId);
  if (!task) return false;
  return task.version === incomingVersion;
}

export function bumpTaskVersion(taskId: string) {
  const task = getTaskById(taskId);
  if (!task) return null;
  task.version += 1;
  task.updatedAt = new Date().toISOString();
  return task;
}

export function getTaskByProject(projectId: string, taskId: string) {
  const project = getProjectById(projectId);
  if (!project) return null;
  return getProjectTask(projectId, taskId);
}
