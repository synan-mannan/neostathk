"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  CheckSquare,
  ArrowLeft,
  Clock,
  User as UserIcon,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Send,
  Trash2,
  Save,
} from "lucide-react";

interface TaskDetail {
  id: string;
  project_id: string;
  project_name: string;
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

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = (params?.id as string) || "";
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<TaskDetail["status"]>("TODO");
  const [editPriority, setEditPriority] = useState<TaskDetail["priority"]>("MEDIUM");
  const [isSaving, setIsSaving] = useState(false);

  // 409 Conflict Modal State
  const [conflictModal, setConflictModal] = useState<{
    show: boolean;
    message: string;
    latestTask: any;
  } | null>(null);

  const fetchTaskAndComments = async () => {
    try {
      setLoading(true);
      const [tRes, cRes] = await Promise.all([
        apiFetch<{ success: boolean; task: TaskDetail }>(`api/tasks/${taskId}`),
        apiFetch<{ success: boolean; comments: Comment[] }>(`api/tasks/${taskId}/comments`),
      ]);

      if (tRes.success) {
        setTask(tRes.task);
        setEditTitle(tRes.task.title);
        setEditDesc(tRes.task.description || "");
        setEditStatus(tRes.task.status);
        setEditPriority(tRes.task.priority);
      }
      if (cRes.success) setComments(cRes.comments);
    } catch (err: any) {
      setError(err?.message || "Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user && taskId) {
      fetchTaskAndComments();
    }
  }, [user, authLoading, taskId, router]);

  // Connect socket room once task is loaded
  useEffect(() => {
    if (!task?.project_id) return;

    const socket = getSocket();
    socket.emit("subscribe:project", task.project_id);

    const onCommentCreated = (comment: Comment) => {
      if (comment.task_id === taskId) {
        setComments((prev) => [...prev, comment]);
      }
    };

    const onCommentDeleted = ({ id, taskId: cTaskId }: { id: string; taskId: string }) => {
      if (cTaskId === taskId) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    };

    const onTaskUpdated = (updatedTask: TaskDetail) => {
      if (updatedTask.id === taskId) {
        setTask(updatedTask);
        setEditTitle(updatedTask.title);
        setEditDesc(updatedTask.description || "");
        setEditStatus(updatedTask.status);
        setEditPriority(updatedTask.priority);
      }
    };

    socket.on("comment:created", onCommentCreated);
    socket.on("comment:deleted", onCommentDeleted);
    socket.on("task:updated", onTaskUpdated);

    return () => {
      socket.off("comment:created", onCommentCreated);
      socket.off("comment:deleted", onCommentDeleted);
      socket.off("task:updated", onTaskUpdated);
      socket.emit("unsubscribe:project", task.project_id);
    };
  }, [task?.project_id, taskId]);

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setIsSaving(true);

    try {
      const res = await apiFetch<{ success: boolean; task: TaskDetail }>(`api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          status: editStatus,
          priority: editPriority,
          version: task.version, // Pass current version for optimistic concurrency control
        }),
      });

      if (res.success) {
        setTask(res.task);
      }
    } catch (err: any) {
      if (err.status === 409) {
        // Optimistic concurrency collision!
        setConflictModal({
          show: true,
          message: err.message || "Conflict: Stale version detected.",
          latestTask: err.data?.currentTask,
        });
      } else {
        alert(err.message || "Failed to update task");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await apiFetch(`api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment("");
    } catch (err: any) {
      alert(err.message || "Failed to post comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await apiFetch(`api/comments/${commentId}`, { method: "DELETE" });
    } catch (err: any) {
      alert(err.message || "Failed to delete comment");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <h3 className="text-base font-semibold text-rose-800">Error</h3>
        <p className="mt-1 text-sm text-rose-600">{error || "Task not found"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/projects/${task.project_id}/tasks`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Project Tasks ({task.project_name})
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Task Details & Concurrency Control
          </h1>
          <span className="rounded bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-100">
            Version v{task.version}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Task Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskDetail["status"])}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskDetail["priority"])}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>

          {/* Comments Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              Comments ({comments.length})
            </h2>

            <div className="divide-y divide-slate-100">
              {comments.length === 0 ? (
                <p className="py-4 text-xs text-slate-400 text-center">No comments posted yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{c.user_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">
                          {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {(c.user_id === user?.id || user?.role === "ADMIN") && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-slate-400 hover:text-rose-600"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-700">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handleCreateComment} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Send className="h-4 w-4" />
                Post
              </button>
            </form>
          </div>
        </div>

        {/* Task Meta Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Task Meta Details
            </h3>

            <div className="space-y-3 divide-y divide-slate-100">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Project</span>
                <span className="font-semibold text-slate-900">{task.project_name}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Assignee</span>
                <span className="font-semibold text-slate-900">
                  {task.assignee_name || "Unassigned"}
                </span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Created by</span>
                <span className="font-semibold text-slate-900">{task.creator_name || "System"}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Optimistic Version</span>
                <span className="font-mono font-bold text-indigo-600">v{task.version}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Created at</span>
                <span className="text-slate-600">{new Date(task.created_at).toLocaleString()}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Last updated</span>
                <span className="text-slate-600">{new Date(task.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 409 Conflict Dialog */}
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
                <p className="font-semibold text-slate-800">Fresh values from database:</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div><strong>Title:</strong> {conflictModal.latestTask.title}</div>
                  <div><strong>Status:</strong> {conflictModal.latestTask.status}</div>
                  <div><strong>Priority:</strong> {conflictModal.latestTask.priority}</div>
                  <div><strong>New Version:</strong> v{conflictModal.latestTask.version}</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConflictModal(null);
                  fetchTaskAndComments();
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
    </div>
  );
}
