"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  CheckSquare,
  Plus,
  Filter,
  Search,
  AlertTriangle,
  ArrowLeft,
  Clock,
  User as UserIcon,
  MessageSquare,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignee_id: string | null;
  assignee_name?: string | null;
  creator_name?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  project_role: string;
}

export default function ProjectTasksPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "";
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("VIEWER");
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("MEDIUM");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [createError, setCreateError] = useState<string | null>(null);

  // 409 Conflict Modal State (MANDATORY REQUIREMENT)
  const [conflictModal, setConflictModal] = useState<{
    show: boolean;
    taskId: string;
    message: string;
    latestTask: any;
    attemptedUpdate: any;
  } | null>(null);

  const fetchProjectAndTasks = async () => {
    try {
      setLoading(true);

      let query = `api/projects/${projectId}/tasks`;
      const queryParams: string[] = [];
      if (statusFilter) queryParams.push(`status=${statusFilter}`);
      if (priorityFilter) queryParams.push(`priority=${priorityFilter}`);
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (queryParams.length > 0) query += `?${queryParams.join("&")}`;

      const [tasksRes, projRes, membersRes] = await Promise.all([
        apiFetch<{ success: boolean; tasks: Task[] }>(query),
        apiFetch<{ success: boolean; project: any }>(`api/projects/${projectId}`),
        apiFetch<{ success: boolean; members: Member[] }>(`api/projects/${projectId}/members`),
      ]);

      if (tasksRes.success) setTasks(tasksRes.tasks);
      if (projRes.success) setCurrentUserRole(projRes.project.currentUserRole || "VIEWER");
      if (membersRes.success) setMembers(membersRes.members);
    } catch (err: any) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user && projectId) {
      fetchProjectAndTasks();

      const socket = getSocket();
      socket.emit("subscribe:project", projectId);

      // Real-time Socket Event Handlers
      const onTaskCreated = (newTask: Task) => {
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          return [newTask, ...prev];
        });
      };

      const onTaskUpdated = (updatedTask: Task) => {
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      };

      const onTaskStatusChanged = (updatedTask: Task) => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === updatedTask.id
              ? { ...t, status: updatedTask.status, version: updatedTask.version }
              : t
          )
        );
      };

      const onTaskAssigned = (updatedTask: Task) => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === updatedTask.id
              ? {
                  ...t,
                  assignee_id: updatedTask.assignee_id,
                  assignee_name: updatedTask.assignee_name,
                  version: updatedTask.version,
                }
              : t
          )
        );
      };

      const onTaskDeleted = ({ id }: { id: string }) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      };

      socket.on("task:created", onTaskCreated);
      socket.on("task:updated", onTaskUpdated);
      socket.on("task:status_changed", onTaskStatusChanged);
      socket.on("task:assigned", onTaskAssigned);
      socket.on("task:deleted", onTaskDeleted);

      return () => {
        socket.off("task:created", onTaskCreated);
        socket.off("task:updated", onTaskUpdated);
        socket.off("task:status_changed", onTaskStatusChanged);
        socket.off("task:assigned", onTaskAssigned);
        socket.off("task:deleted", onTaskDeleted);
        socket.emit("unsubscribe:project", projectId);
      };
    }
  }, [user, authLoading, projectId, statusFilter, priorityFilter, router]);

  const canManageTasks = user?.role === "ADMIN" || currentUserRole === "MANAGER";
  const isViewer = currentUserRole === "VIEWER" && user?.role !== "ADMIN";

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    try {
      const res = await apiFetch<{ success: boolean; task: Task }>(`api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          priority: newTaskPriority,
          assignee_id: newTaskAssignee || null,
        }),
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskAssignee("");
      }
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create task");
    }
  };

  const handleStatusChange = async (task: Task, newStatus: Task["status"]) => {
    try {
      await apiFetch(`api/tasks/${task.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          version: task.version, // Pass current client version for optimistic check
        }),
      });
    } catch (err: any) {
      if (err.status === 409) {
        // Optimistic concurrency collision! Show conflict modal
        setConflictModal({
          show: true,
          taskId: task.id,
          message: err.message || "Conflict: Stale version detected.",
          latestTask: err.data?.currentTask,
          attemptedUpdate: { status: newStatus },
        });
      } else {
        alert(err.message || "Failed to update status");
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiFetch(`api/tasks/${taskId}`, { method: "DELETE" });
    } catch (err: any) {
      alert(err.message || "Failed to delete task");
    }
  };

  const priorityBadge: Record<Task["priority"], string> = {
    LOW: "bg-slate-100 text-slate-700 border-slate-200",
    MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
    URGENT: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Project Overview
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Project Task Board
          </h1>
          <p className="text-xs text-slate-500">
            Real-time collaborative updates enabled • Optimistic concurrency protected
          </p>
        </div>

        {canManageTasks && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <CheckSquare className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No tasks found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {canManageTasks ? "Get started by adding a task to this project." : "No tasks match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isUserAssignee = task.assignee_id === user?.id;
            const canModifyThisTask = canManageTasks || isUserAssignee;

            return (
              <div
                key={task.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200 transition-all"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase ${
                        priorityBadge[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[11px] text-slate-400">v{task.version}</span>
                    <h3 className="text-base font-bold text-slate-900 hover:text-indigo-600">
                      <Link href={`/tasks/${task.id}`}>{task.title}</Link>
                    </h3>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                      {task.assignee_name ? `Assigned to ${task.assignee_name}` : "Unassigned"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(task.updated_at).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Comments & Details
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Status Dropdown */}
                  <select
                    disabled={!canModifyThisTask || isViewer}
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value as Task["status"])}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>

                  {canManageTasks && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 409 Conflict Modal */}
      {conflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-rose-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Version Conflict (HTTP 409)
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {conflictModal.message}
                </p>
              </div>
            </div>

            {conflictModal.latestTask && (
              <div className="mt-4 rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                <p className="font-semibold text-slate-800">Latest server record:</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div><strong>Title:</strong> {conflictModal.latestTask.title}</div>
                  <div><strong>Status:</strong> {conflictModal.latestTask.status}</div>
                  <div><strong>Priority:</strong> {conflictModal.latestTask.priority}</div>
                  <div><strong>Version:</strong> v{conflictModal.latestTask.version}</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConflictModal(null);
                  fetchProjectAndTasks();
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Latest Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Create New Task</h3>

            {createError && (
              <div className="mt-3 rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task details..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Task["priority"])}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Assignee
                  </label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.project_role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
