"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Card, Button, Badge, Alert, Skeleton } from "@/components/ui";
import {
  FolderKanban,
  CheckSquare,
  Users,
  Activity,
  Calendar,
  UserCheck,
  Shield,
  ArrowRight,
  ArrowLeft,
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
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <Alert variant="danger" title="Error Loading Project">
          {error || "Project not found or access unauthorized."}
        </Alert>
        <Link href="/projects" className="mt-4 inline-block">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Button>
        </Link>
      </Card>
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
      <Card glow className="p-6 sm:p-8 bg-radial-glow bg-top bg-no-repeat">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={project.status === "ACTIVE" ? "highlight" : "muted"}>
                {project.status}
              </Badge>
              <span className="text-xs text-muted">
                Your Role: <strong className="text-highlight font-mono">{project.currentUserRole || "VIEWER"}</strong>
              </span>
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-text">
              {project.name}
            </h1>
            <p className="mt-2 text-sm text-muted max-w-3xl leading-relaxed">
              {project.description || "No description provided for this project."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={`/projects/${projectId}/tasks`}>
              <Button variant="primary">
                <CheckSquare className="h-4 w-4" />
                Task Board
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/team`}>
              <Button variant="secondary">
                <Users className="h-4 w-4" />
                Team
              </Button>
            </Link>
            <Link href={`/projects/${projectId}/activity`}>
              <Button variant="secondary">
                <Activity className="h-4 w-4" />
                Activity
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center gap-6 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-highlight/70" />
            Created {new Date(project.created_at).toLocaleDateString()}
          </div>
          {project.creator_name && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-highlight/70" />
              Initiated by {project.creator_name}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-highlight/70" />
            {project.members?.length || 0} Members
          </div>
        </div>
      </Card>

      {/* Task Metrics Overview */}
      <div>
        <h2 className="text-base font-bold text-text mb-3 flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-highlight" />
          Task Status Breakdown
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4 border-border">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">To Do</span>
            <p className="mt-2 text-2xl font-bold text-text">{statusMap.TODO}</p>
          </Card>
          <Card className="p-4 border-highlight/30 bg-primary/10">
            <span className="text-xs font-semibold text-highlight uppercase tracking-wider">In Progress</span>
            <p className="mt-2 text-2xl font-bold text-highlight">{statusMap.IN_PROGRESS}</p>
          </Card>
          <Card className="p-4 border-warning/30 bg-warning/5">
            <span className="text-xs font-semibold text-warning uppercase tracking-wider">In Review</span>
            <p className="mt-2 text-2xl font-bold text-warning">{statusMap.IN_REVIEW}</p>
          </Card>
          <Card className="p-4 border-highlight/40 bg-card">
            <span className="text-xs font-semibold text-highlight uppercase tracking-wider">Done</span>
            <p className="mt-2 text-2xl font-bold text-highlight">{statusMap.DONE}</p>
          </Card>
        </div>
      </div>

      {/* Team Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-text flex items-center gap-2">
            <Users className="h-4 w-4 text-highlight" />
            Project Members ({project.members?.length || 0})
          </h2>
          <Link
            href={`/projects/${projectId}/team`}
            className="text-xs font-semibold text-highlight hover:underline flex items-center gap-1"
          >
            Manage Team <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {project.members?.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold text-text">{m.name}</span>
                <span className="ml-2 text-xs text-muted">({m.email})</span>
              </div>
              <Badge variant={m.project_role === "MANAGER" ? "highlight" : "default"}>
                {m.project_role}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
