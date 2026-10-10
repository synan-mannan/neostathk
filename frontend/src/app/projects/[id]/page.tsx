"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  FolderKanban,
  CheckSquare,
  Users,
  Activity,
  Calendar,
  UserCheck,
  Shield,
  ArrowRight,
  Edit3,
} from "lucide-react";

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  creator_name?: string;
  currentUserRole?: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    project_role: string;
  }>;
  taskStats: Array<{
    status: string;
    count: number;
  }>;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "";
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; project: ProjectDetail }>(`api/projects/${projectId}`);
      if (res.success) {
        setProject(res.project);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load project details");
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
      fetchProject();

      const socket = getSocket();
      socket.emit("subscribe:project", projectId);

      return () => {
        socket.emit("unsubscribe:project", projectId);
      };
    }
  }, [user, authLoading, projectId, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <h3 className="text-base font-semibold text-rose-800">Error Loading Project</h3>
        <p className="mt-1 text-sm text-rose-600">{error || "Project not found or access unauthorized."}</p>
        <Link
          href="/projects"
          className="mt-4 inline-block rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const statusMap: Record<string, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };

  project.taskStats?.forEach((s) => {
    statusMap[s.status] = s.count;
  });

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${
                  project.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {project.status}
              </span>
              <span className="text-xs text-slate-500">
                Your Project Role: <strong className="text-indigo-600">{project.currentUserRole || "VIEWER"}</strong>
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {project.name}
            </h1>
            <p className="mt-2 text-base text-slate-600 max-w-3xl">
              {project.description || "No description provided for this project."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/projects/${projectId}/tasks`}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <CheckSquare className="h-4 w-4" />
              Task Board
            </Link>
            <Link
              href={`/projects/${projectId}/team`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Users className="h-4 w-4" />
              Team
            </Link>
            <Link
              href={`/projects/${projectId}/activity`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Activity className="h-4 w-4" />
              Activity Log
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            Created {new Date(project.created_at).toLocaleDateString()}
          </div>
          {project.creator_name && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-slate-400" />
              Initiated by {project.creator_name}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" />
            {project.members?.length || 0} Members
          </div>
        </div>
      </div>

      {/* Task Metrics Overview */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Task Status Breakdown</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">To Do</span>
            <p className="mt-2 text-2xl font-bold text-slate-800">{statusMap.TODO}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
            <span className="text-xs font-semibold text-blue-600 uppercase">In Progress</span>
            <p className="mt-2 text-2xl font-bold text-blue-900">{statusMap.IN_PROGRESS}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <span className="text-xs font-semibold text-amber-600 uppercase">In Review</span>
            <p className="mt-2 text-2xl font-bold text-amber-900">{statusMap.IN_REVIEW}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Done</span>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{statusMap.DONE}</p>
          </div>
        </div>
      </div>

      {/* Team Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Project Members ({project.members?.length || 0})
          </h2>
          <Link
            href={`/projects/${projectId}/team`}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            Manage Team <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {project.members?.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold text-slate-800">{m.name}</span>
                <span className="ml-2 text-xs text-slate-500">({m.email})</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {m.project_role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
