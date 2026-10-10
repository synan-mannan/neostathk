"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import {
  Users,
  UserPlus,
  ArrowLeft,
  Shield,
  Trash2,
  Mail,
  UserCheck,
} from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string;
  global_role: string;
  project_role: "MANAGER" | "MEMBER" | "VIEWER";
  joined_at: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ProjectTeamPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "";
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("VIEWER");
  const [loading, setLoading] = useState(true);

  // Add Member Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<Member["project_role"]>("MEMBER");
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const [membersRes, projRes] = await Promise.all([
        apiFetch<{ success: boolean; members: Member[] }>(`api/projects/${projectId}/members`),
        apiFetch<{ success: boolean; project: any }>(`api/projects/${projectId}`),
      ]);

      if (membersRes.success) setMembers(membersRes.members);
      if (projRes.success) setCurrentUserRole(projRes.project.currentUserRole || "VIEWER");

      // If manager or admin, fetch available users list
      if (user?.role === "ADMIN" || projRes.project?.currentUserRole === "MANAGER") {
        if (user?.role === "ADMIN") {
          const uRes = await apiFetch<{ success: boolean; users: UserOption[] }>("api/users");
          if (uRes.success) setAllUsers(uRes.users);
        }
      }
    } catch (err: any) {
      console.error("Error fetching team:", err);
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
      fetchTeam();

      const socket = getSocket();
      socket.emit("subscribe:project", projectId);

      const onMemberAdded = (newMember: Member) => {
        setMembers((prev) => {
          if (prev.some((m) => m.id === newMember.id)) return prev;
          return [...prev, newMember];
        });
      };

      const onMemberUpdated = (updatedMember: any) => {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === updatedMember.user_id ? { ...m, project_role: updatedMember.project_role } : m
          )
        );
      };

      const onMemberRemoved = ({ userId }: { userId: string }) => {
        setMembers((prev) => prev.filter((m) => m.id !== userId));
      };

      socket.on("project:member_added", onMemberAdded);
      socket.on("project:member_updated", onMemberUpdated);
      socket.on("project:member_removed", onMemberRemoved);

      return () => {
        socket.off("project:member_added", onMemberAdded);
        socket.off("project:member_updated", onMemberUpdated);
        socket.off("project:member_removed", onMemberRemoved);
        socket.emit("unsubscribe:project", projectId);
      };
    }
  }, [user, authLoading, projectId, router]);

  const canManageTeam = user?.role === "ADMIN" || currentUserRole === "MANAGER";

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await apiFetch(`api/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({
          user_id: selectedUserId,
          project_role: selectedRole,
        }),
      });

      setShowAddModal(false);
      setSelectedUserId("");
      fetchTeam();
    } catch (err: any) {
      setError(err?.message || "Failed to add member to project");
    }
  };

  const handleUpdateRole = async (memberUserId: string, newRole: Member["project_role"]) => {
    try {
      await apiFetch(`api/projects/${projectId}/members/${memberUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ project_role: newRole }),
      });
    } catch (err: any) {
      alert(err?.message || "Failed to update project role");
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!confirm("Are you sure you want to remove this member from the project?")) return;
    try {
      await apiFetch(`api/projects/${projectId}/members/${memberUserId}`, {
        method: "DELETE",
      });
    } catch (err: any) {
      alert(err?.message || "Failed to remove member");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Project
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Project Team Members
          </h1>
          <p className="text-xs text-slate-500">
            Role assignments are project-scoped (MANAGER, MEMBER, VIEWER).
          </p>
        </div>

        {canManageTeam && user?.role === "ADMIN" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {members.map((m) => (
            <div
              key={m.id}
              className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{m.name}</span>
                    <span className="text-xs text-slate-400">({m.global_role})</span>
                  </div>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {m.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canManageTeam ? (
                  <select
                    value={m.project_role}
                    onChange={(e) => handleUpdateRole(m.id, e.target.value as Member["project_role"])}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="MANAGER">MANAGER</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                    {m.project_role}
                  </span>
                )}

                {canManageTeam && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    title="Remove Member"
                    className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Add Team Member</h3>
            {error && (
              <div className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Select User
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose a user --</option>
                  {allUsers
                    .filter((u) => !members.some((m) => m.id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.role}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Project Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Member["project_role"])}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="MANAGER">MANAGER</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
