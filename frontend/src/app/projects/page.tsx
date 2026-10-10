"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage projects, view task boards, and coordinate team members.
          </p>
        </div>

        {user?.role === "ADMIN" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Search
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <FolderKanban className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No projects found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {search || statusFilter ? "Try adjusting your search filters." : "No projects assigned to your account yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded uppercase ${
                      proj.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {proj.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {proj.member_count} member{proj.member_count !== 1 ? "s" : ""}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  <Link href={`/projects/${proj.id}`} className="hover:text-indigo-600">
                    {proj.name}
                  </Link>
                </h3>

                <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                  {proj.description || "No project description provided."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{proj.task_count} tasks</span>
                  {proj.creator_name && <span>By {proj.creator_name}</span>}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {user?.role === "ADMIN" && proj.status === "ACTIVE" && (
                      <button
                        onClick={() => handleArchiveProject(proj.id)}
                        title="Archive Project"
                        className="p-1.5 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                    {user?.role === "ADMIN" && (
                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        title="Delete Project"
                        className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Link
                    href={`/projects/${proj.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View Project <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Create New Project</h3>
            <p className="mt-1 text-xs text-slate-500">
              Only Admins can create new project workspaces.
            </p>

            {createError && (
              <div className="mt-3 rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Apollo"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the objectives and scope..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
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
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
