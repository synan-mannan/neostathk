"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Alert,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import {
  CheckSquare,
  Plus,
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
  isNew?: boolean;
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

      // Real-time Socket Event Handlers with brief highlight indicator
      const onTaskCreated = (newTask: Task) => {
        setTasks((prev) => {
          if (prev.some((t) => t.id === newTask.id)) return prev;
          return [{ ...newTask, isNew: true }, ...prev];
        });
      };

      const onTaskUpdated = (updatedTask: Task) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === updatedTask.id ? { ...updatedTask, isNew: true } : t))
        );
      };

      const onTaskStatusChanged = (updatedTask: Task) => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === updatedTask.id
              ? { ...t, status: updatedTask.status, version: updatedTask.version, isNew: true }
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
                  isNew: true,
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
          version: task.version, // Pass current client version for optimistic concurrency
        }),
      });
    } catch (err: any) {
      if (err.status === 409) {
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

  const priorityBadge: Record<Task["priority"], "muted" | "highlight" | "warning" | "danger"> = {
    LOW: "muted",
    MEDIUM: "highlight",
    HIGH: "warning",
    URGENT: "danger",
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-highlight hover:text-highlight/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Project Overview
            </Link>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-text">
            Project Task Board
          </h1>
          <p className="text-xs text-muted">
            Real-time collaborative updates enabled • Optimistic concurrency protected
          </p>
        </div>

        {canManageTasks && (
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-card border border-border pl-10 pr-3.5 py-2 text-sm text-text placeholder:text-muted focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/60 transition-colors"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </Select>
        </div>

        <div className="w-full sm:w-44">
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </Select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description={
            canManageTasks
              ? "Get started by adding a task to this project board."
              : "No tasks match your selected filters."
          }
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isUserAssignee = task.assignee_id === user?.id;
            const canModifyThisTask = canManageTasks || isUserAssignee;

            return (
              <Card
                key={task.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:border-highlight/40 transition-all ${
                  task.isNew ? "border-highlight shadow-[0_0_12px_rgba(134,239,172,0.15)]" : ""
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={priorityBadge[task.priority]}>
                      {task.priority}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted">v{task.version}</span>
                    <h3 className="text-base font-bold text-text hover:text-highlight transition-colors">
                      <Link href={`/tasks/${task.id}`}>{task.title}</Link>
                    </h3>
                  </div>

                  {task.description && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-highlight/70" />
                      {task.assignee_name ? `Assigned: ${task.assignee_name}` : "Unassigned"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted" />
                      {new Date(task.updated_at).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="inline-flex items-center gap-1 text-highlight hover:underline font-medium"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Comments & Details
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Status Dropdown */}
                  <select
                    disabled={!canModifyThisTask || isViewer}
                    value={task.status}
                    onChange={(e) => handleStatusChange(task, e.target.value as Task["status"])}
                    className="rounded-lg bg-card border border-border px-3 py-1.5 text-xs font-semibold text-text shadow-sm focus:border-highlight focus:outline-none disabled:opacity-50 transition-colors"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>

                  {canManageTasks && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTask(task.id)}
                      title="Delete task"
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 409 Conflict Modal */}
      <Modal
        isOpen={!!conflictModal}
        onClose={() => setConflictModal(null)}
        title="Version Conflict (HTTP 409)"
        description="Concurrent update detected. Another user modified this task in the background."
      >
        <div className="space-y-4">
          <Alert variant="warning">
            {conflictModal?.message}
          </Alert>

          {conflictModal?.latestTask && (
            <div className="rounded-xl bg-card border border-border p-4 text-xs space-y-2">
              <p className="font-semibold text-highlight">Latest values from server:</p>
              <div className="grid grid-cols-2 gap-2 text-muted">
                <div><strong>Title:</strong> {conflictModal.latestTask.title}</div>
                <div><strong>Status:</strong> {conflictModal.latestTask.status}</div>
                <div><strong>Priority:</strong> {conflictModal.latestTask.priority}</div>
                <div><strong>Version:</strong> v{conflictModal.latestTask.version}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setConflictModal(null);
                fetchProjectAndTasks();
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Reload Latest Task
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Task"
        description="Add a task with priority and optional member assignment."
      >
        {createError && (
          <Alert variant="danger" className="mb-4">
            {createError}
          </Alert>
        )}

        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Title
            </label>
            <Input
              required
              placeholder="e.g. Implement WebSocket Auth"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Task details and deliverables..."
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              className="w-full rounded-xl bg-card border border-border px-3.5 py-2 text-sm text-text placeholder:text-muted focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/60 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Priority
              </label>
              <Select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Task["priority"])}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Assignee
              </label>
              <Select
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.project_role})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
