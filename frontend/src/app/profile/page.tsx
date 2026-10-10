"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { User as UserIcon, Shield, Mail, CheckCircle2, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Profile</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-indigo-600" /> Global Role
            </span>
            <p className="mt-2 text-base font-bold text-slate-800">
              {user.role.replace(/_/g, " ")}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Account Status
            </span>
            <p className="mt-2 text-base font-bold text-emerald-700">
              {user.is_active ? "Active" : "Deactivated"}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
