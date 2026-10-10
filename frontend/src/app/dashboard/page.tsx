"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  ArrowRight,
  Plus,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  member_count: number;
  task_count: number;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  user_name?: string;
  project_name?: string;
  created_at: string;
  metadata: any;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Status breakdown metrics
  const [stats, setStats] = useState({
    todo: 0,
    inProgress: 0,
    inReview: 0,
    done: 0,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, notifRes] = await Promise.all([
        apiFetch<{ success: boolean; projects: Project[] }>("api/projects"),
        apiFetch<{ success: boolean; unreadCount: number }>("api/notifications"),
      ]);

      if (projRes.success) setProjects(projRes.projects);
      if (notifRes.success) setUnreadCount(notifRes.unreadCount);

      // Fetch recent activities (global if admin, or first project if member)
      if (user?.role === "ADMIN") {
        const actRes = await apiFetch<{ success: boolean; activities: ActivityLog[] }>("api/activity");
        if (actRes.success) setActivities(actRes.activities.slice(0, 8));
      } else if (projRes.projects.length > 0) {
        const actRes = await apiFetch<{ success: boolean; activities: ActivityLog[] }>(
          `api/projects/${projRes.projects[0].id}/activity`
        );
        if (actRes.success) setActivities(actRes.activities.slice(0, 8));
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      fetchData();

      const socket = getSocket();
      const onActivity = (newAct: ActivityLog) => {
        setActivities((prev) => [newAct, ...prev.slice(0, 7)]);
      };

      socket.on("activity:created", onActivity);

      return () => {
        socket.off("activity:created", onActivity);
      };
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Role: <span className="font-semibold text-indigo-700">{user?.role.replace("_", " ")}</span> • Real-time synchronization active.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "ADMIN" && (
              <Link
                href="/projects"
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Project
              </Link>
            )}
            <Link
              href="/notifications"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              Notifications
              {unreadCount > 0 && (
                <span className="ml-1 rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Projects and Activity Feed */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Projects Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-indigo-600" />
              Your Projects ({projects.length})
            </h2>
            <Link
              href="/projects"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white">
              <FolderKanban className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">No active projects available.</p>
              {user?.role === "ADMIN" && (
                <Link
                  href="/projects"
                  className="mt-3 inline-block text-sm font-medium text-indigo-600 underline"
                >
                  Create your first project
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {proj.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {proj.member_count} member{proj.member_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-slate-900">
                      <Link href={`/projects/${proj.id}`} className="hover:text-indigo-600">
                        {proj.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                      {proj.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {proj.task_count} total task{proj.task_count !== 1 ? "s" : ""}
                    </span>
                    <Link
                      href={`/projects/${proj.id}/tasks`}
                      className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Tasks <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Activity Feed Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Live Activity
            </h2>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live sync" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm divide-y divide-slate-100">
            {activities.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">No recent activity logged.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="py-3 first:pt-0 last:pb-0 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {act.user_name || "System"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    <span className="font-medium text-indigo-600">{act.action.replace("_", " ")}</span> on {act.entity_type.toLowerCase()}
                  </p>
                  {act.metadata?.title && (
                    <p className="mt-0.5 text-slate-500 italic">"{act.metadata.title}"</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
