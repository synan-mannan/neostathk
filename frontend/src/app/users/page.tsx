"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Users, UserPlus, ShieldAlert, Check, X, Shield, Lock } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PROJECT_MANAGER" | "TEAM_MEMBER" | "VIEWER";
  is_active: boolean;
  created_at: string;
}

export default function UsersAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("TEAM_MEMBER");
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; users: AdminUser[] }>("api/users");
      if (res.success) setUsersList(res.users);
    } catch (err: any) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.role !== "ADMIN") {
        router.replace("/dashboard");
        return;
      }
      fetchUsers();
    }
  }, [user, authLoading, router]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await apiFetch("api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });

      setShowCreateModal(false);
      setName("");
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to create user");
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    try {
      await apiFetch(`api/users/${userId}/deactivate`, { method: "PATCH" });
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || "Failed to deactivate user");
    }
  };

  const handleRoleChange = async (userId: string, newRole: AdminUser["role"]) => {
    try {
      await apiFetch(`api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || "Failed to update role");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <Users className="h-6 w-6 text-highlight" />
            User Management (Admin Only)
          </h1>
          <p className="text-xs text-muted">
            Create, update roles, and deactivate users system-wide.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text shadow-sm hover:bg-primary/90 hover:shadow-glow transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60 motion-reduce:transition-none"
        >
          <UserPlus className="h-4 w-4" />
          Create New User
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-border/25 text-xs font-semibold text-muted uppercase">
            <tr>
              <th className="px-6 py-3 text-left">User</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Joined</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usersList.map((u) => (
              <tr key={u.id} className="hover:bg-border/20">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <span className="font-semibold text-text block">{u.name}</span>
                    <span className="text-xs text-muted">{u.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    disabled={u.id === user?.id}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as AdminUser["role"])}
                    className="rounded-lg border border-border bg-bg px-2 py-1 text-xs font-medium text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60 disabled:opacity-50"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                    <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                      u.is_active
                        ? "bg-primary/15 text-highlight"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {u.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-muted">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {u.is_active && u.id !== user?.id && (
                    <button
                      onClick={() => handleDeactivate(u.id)}
                      className="text-xs font-semibold text-danger hover:text-danger/80"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border">
            <h3 className="text-lg font-bold text-text">Create System User</h3>
            {error && (
              <div className="mt-2 rounded-lg bg-danger/10 p-2 text-xs text-danger border border-danger/30">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@neostats.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase">
                  Global Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminUser["role"])}
                  className="mt-1 block w-full rounded-xl border border-border bg-bg px-3.5 py-2 text-sm text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                  <option value="TEAM_MEMBER">TEAM_MEMBER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-border/40 transition-colors duration-200 motion-reduce:transition-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text hover:bg-primary/90 hover:shadow-glow shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60 motion-reduce:transition-none"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
