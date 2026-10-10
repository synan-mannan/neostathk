"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Card, Button, Badge, Skeleton } from "@/components/ui";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  ArrowRight,
  Plus,
  Sparkles,
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
  isNew?: boolean;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, notifRes] = await Promise.all([
        apiFetch<{ success: boolean; projects: Project[] }>("api/projects"),
        apiFetch<{ success: boolean; unreadCount: number }>("api/notifications"),
      ]);

      if (projRes.success) setProjects(projRes.projects);
      if (notifRes.success) setUnreadCount(notifRes.unreadCount);

      // Fetch recent activities
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
        // Tag with isNew for subtle highlight fade
        setActivities((prev) => [{ ...newAct, isNew: true }, ...prev.slice(0, 7)]);
      };

      socket.on("activity:created", onActivity);

      return () => {
        socket.off("activity:created", onActivity);
      };
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome banner with subtle radial emerald glow */}
      <Card glow className="relative overflow-hidden bg-radial-glow bg-top bg-no-repeat p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="highlight">
                <Sparkles className="h-3 w-3 mr-1" /> AI Real-time Engine
              </Badge>
              <span className="text-xs text-muted">Active Session</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">
              Welcome back, {user?.name}!
            </h1>
            <p className="mt-1 text-sm text-muted">
              Role: <span className="font-semibold text-highlight">{user?.role.replace("_", " ")}</span> • Project synchronization and conflict resolution active.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "ADMIN" && (
              <Link href="/projects">
                <Button variant="primary">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </Link>
            )}
            <Link href="/notifications">
              <Button variant="secondary">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-1 rounded-full bg-danger px-1.5 py-0.2 text-[10px] text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Grid of Projects and Activity Feed */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Projects Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-highlight" />
              Your Projects ({projects.length})
            </h2>
            <Link
              href="/projects"
              className="text-xs font-semibold text-highlight hover:text-highlight/80 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-muted" />
              <p className="mt-3 text-sm text-muted">No projects assigned to your account yet.</p>
              {user?.role === "ADMIN" && (
                <Link href="/projects" className="mt-4 inline-block">
                  <Button variant="primary" size="sm">
                    Create first project
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {projects.map((proj) => (
                <Card
                  key={proj.id}
                  glow
                  className="flex flex-col justify-between p-5 hover:border-highlight/40 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={proj.status === "ACTIVE" ? "highlight" : "muted"}>
                        {proj.status}
                      </Badge>
                      <span className="text-xs text-muted">
                        {proj.member_count} member{proj.member_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-bold text-text group-hover:text-highlight transition-colors">
                      <Link href={`/projects/${proj.id}`}>
                        {proj.name}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-xs text-muted line-clamp-2">
                      {proj.description || "No project description provided."}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted">
                      {proj.task_count} total task{proj.task_count !== 1 ? "s" : ""}
                    </span>
                    <Link
                      href={`/projects/${proj.id}/tasks`}
                      className="text-xs font-semibold text-highlight hover:underline flex items-center gap-1"
                    >
                      Tasks <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Activity Feed Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <Activity className="h-5 w-5 text-highlight" />
              Live Activity
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-highlight shadow-glow-sm animate-pulse" />
              <span className="text-[10px] text-muted uppercase tracking-wider">Live</span>
            </div>
          </div>

          <Card className="p-4 divide-y divide-border">
            {activities.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">No recent activity logged.</p>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className={`py-3 first:pt-0 last:pb-0 text-xs transition-colors duration-500 ${
                    act.isNew ? "bg-highlight/5 rounded-lg px-2" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text">
                      {act.user_name || "System"}
                    </span>
                    <span className="text-[11px] text-muted">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    <span className="font-medium text-highlight">{act.action.replace("_", " ")}</span> on {act.entity_type.toLowerCase()}
                  </p>
                  {act.metadata?.title && (
                    <p className="mt-0.5 text-muted/80 italic font-mono text-[11px]">"{act.metadata.title}"</p>
                  )}
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
