"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Input, Card, Alert, Tabs } from "@/components/ui";
import { LogIn, UserPlus, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<string>("login");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (mode === "login"
            ? "Invalid credentials. Please verify your email and password."
            : "Registration failed. Please check your details and try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickAccount = (demoEmail: string) => {
    setMode("login");
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  const tabs = [
    { id: "login", label: "Sign In" },
    { id: "register", label: "Register New User" },
  ];

  return (
    <div className="flex min-h-[80vh] flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white font-bold text-2xl shadow-glow">
          N
        </div>
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-text">
          {mode === "login" ? "Welcome to NeoStats" : "Create Account"}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {mode === "login"
            ? "Sign in to access your projects and task boards"
            : "New accounts receive Viewer access until an Admin upgrades the role."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card glow className="p-8">
          <Tabs
            tabs={tabs}
            activeTab={mode}
            onChange={(tabId) => {
              setMode(tabId);
              setError(null);
            }}
            className="mb-6"
          />

          {error && (
            <Alert variant="danger" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex@neostats.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 6 characters..." : "••••••••••••"}
              />
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full mt-2"
              size="lg"
            >
              {mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Register & Join</span>
                </>
              )}
            </Button>
          </form>

          {/* Demo Accounts Quick-Fill Panel */}
          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Quick Test Accounts (Click to Fill):
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickAccount("admin@neostats.com")}
                className="flex items-center justify-between rounded-xl border border-border bg-card/80 p-2.5 text-text hover:border-highlight/50 hover:bg-border/30 transition-all text-left group"
              >
                <div>
                  <span className="font-semibold block text-highlight group-hover:text-highlight">Admin</span>
                  <span className="text-[10px] text-muted">Full Access</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-highlight/60 group-hover:text-highlight" />
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount("manager@neostats.com")}
                className="flex items-center justify-between rounded-xl border border-border bg-card/80 p-2.5 text-text hover:border-highlight/50 hover:bg-border/30 transition-all text-left group"
              >
                <div>
                  <span className="font-semibold block text-primary group-hover:text-highlight">Manager</span>
                  <span className="text-[10px] text-muted">Project Lead</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary/60 group-hover:text-highlight" />
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount("member@neostats.com")}
                className="flex items-center justify-between rounded-xl border border-border bg-card/80 p-2.5 text-text hover:border-highlight/50 hover:bg-border/30 transition-all text-left group"
              >
                <div>
                  <span className="font-semibold block text-text group-hover:text-highlight">Member</span>
                  <span className="text-[10px] text-muted">Assigned Tasks</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-muted group-hover:text-highlight" />
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount("viewer@neostats.com")}
                className="flex items-center justify-between rounded-xl border border-border bg-card/80 p-2.5 text-text hover:border-highlight/50 hover:bg-border/30 transition-all text-left group"
              >
                <div>
                  <span className="font-semibold block text-muted group-hover:text-highlight">Viewer</span>
                  <span className="text-[10px] text-muted">Read-Only</span>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-muted group-hover:text-highlight" />
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted">
              Demo accounts password: <code className="text-highlight">Password123!</code>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
