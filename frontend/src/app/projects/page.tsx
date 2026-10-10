"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card, Button, Input, Select, Badge, Modal, Alert, EmptyState, Skeleton } from "@/components/ui";
import { FolderKanban, Plus, Search, Archive, Trash2, ArrowRight } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  member_count: number;
  task_count: number;
  creator_name?: string;
  created_at: string;
}

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // New Project Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      let query = "api/projects";
      const params: string[] = [];
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (params.length > 0) query += `?${params.join("&")}`;

      const res = await apiFetch<{ success: boolean; projects: Project[] }>(query);
      if (res.success) setProjects(res.projects);
    } catch (err: any) {
      console.error("Error fetching projects:", err);
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
      fetchProjects();
    }
  }, [user, authLoading, statusFilter, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    try {
      const res = await apiFetch<{ success: boolean; project: Project }>("api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
        }),
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewProjectName("");
        setNewProjectDesc("");
        fetchProjects();
      }
    } catch (err: any) {
      setCreateError(err?.message || "Failed to create project");
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to archive this project?")) return;
    try {
      await apiFetch(`api/projects/${projectId}/archive`, { method: "PATCH" });
      fetchProjects();
    } catch (err: any) {
      alert(err?.message || "Failed to archive project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to permanently delete this project? This will remove all associated tasks and activity.")) return;
    try {
      await apiFetch(`api/projects/${projectId}`, { method: "DELETE" });
      fetchProjects();
    } catch (err: any) {
      alert(err?.message || "Failed to delete project");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            Manage projects, view task boards, and coordinate team members.
          </p>
        </div>

        {user?.role === "ADMIN" && (
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search projects by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-card border border-border pl-10 pr-3.5 py-2 text-sm text-text placeholder:text-muted focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/60 transition-colors"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description={
            search || statusFilter
              ? "Try adjusting your search filters or status selection."
              : "No projects assigned to your account yet."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => (
            <Card
              key={proj.id}
              glow
              className="flex flex-col justify-between hover:border-highlight/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant={proj.status === "ACTIVE" ? "highlight" : "muted"}>
                    {proj.status}
                  </Badge>
                  <span className="text-xs text-muted">
                    {proj.member_count} member{proj.member_count !== 1 ? "s" : ""}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-text group-hover:text-highlight transition-colors">
                  <Link href={`/projects/${proj.id}`}>
                    {proj.name}
                  </Link>
                </h3>

                <p className="mt-2 text-xs text-muted line-clamp-3 leading-relaxed">
                  {proj.description || "No project description provided."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{proj.task_count} tasks</span>
                  {proj.creator_name && <span>By {proj.creator_name}</span>}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {user?.role === "ADMIN" && proj.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchiveProject(proj.id)}
                        title="Archive Project"
                        className="text-muted hover:text-warning"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                    {user?.role === "ADMIN" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProject(proj.id)}
                        title="Delete Project"
                        className="text-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <Link href={`/projects/${proj.id}`}>
                    <Button variant="ghost" size="sm" className="text-highlight hover:text-highlight/80">
                      View Project <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        description="Only Administrators can initialize system projects."
      >
        {createError && (
          <Alert variant="danger" className="mb-4">
            {createError}
          </Alert>
        )}

        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Project Name
            </label>
            <Input
              required
              placeholder="e.g. Project Apollo - Core"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe objectives and scope..."
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="w-full rounded-xl bg-card border border-border px-3.5 py-2 text-sm text-text placeholder:text-muted focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/60 transition-colors"
            />
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
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
