"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { LogIn, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="flex min-h-[80vh] flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-2xl shadow-md">
          N
        </div>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
          Sign in to NeoStats
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Collaborative Project Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white py-8 px-6 shadow-sm sm:px-10">
          {error && (
            <div className="mb-6 rounded-lg bg-rose-50 p-4 border border-rose-200 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@neostats.com"
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Quick-Switch */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quick Test Accounts (Click to Fill):
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickAccount("admin@neostats.com")}
                className="flex items-center justify-between rounded border border-purple-200 bg-purple-50/60 p-2 text-purple-900 hover:bg-purple-100 transition-colors text-left"
              >
                <div>
                  <span className="font-semibold block">Admin</span>
                  <span className="text-[10px] text-purple-600">Full Access</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount("manager@neostats.com")}
                className="flex items-center justify-between rounded border border-blue-200 bg-blue-50/60 p-2 text-blue-900 hover:bg-blue-100 transition-colors text-left"
              >
                <div>
                  <span className="font-semibold block">Manager</span>
                  <span className="text-[10px] text-blue-600">Project Lead</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount("member@neostats.com")}
                className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50/60 p-2 text-emerald-900 hover:bg-emerald-100 transition-colors text-left"
              >
                <div>
                  <span className="font-semibold block">Member</span>
                  <span className="text-[10px] text-emerald-600">Assigned Tasks</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount("viewer@neostats.com")}
                className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-2 text-slate-800 hover:bg-slate-100 transition-colors text-left"
              >
                <div>
                  <span className="font-semibold block">Viewer</span>
                  <span className="text-[10px] text-slate-500">Read-Only</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Default password for all accounts: <code>Password123!</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
