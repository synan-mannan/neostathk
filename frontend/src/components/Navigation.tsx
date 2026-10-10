"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { apiFetch } from "@/lib/api";
import {
  FolderKanban,
  CheckSquare,
  Users,
  Bell,
  Activity,
  LogOut,
  User as UserIcon,
  Shield,
  LayoutDashboard,
} from "lucide-react";

export function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    // Fetch initial notification count
    apiFetch<{ success: boolean; unreadCount: number }>("api/notifications")
      .then((res) => {
        if (res.success) setUnreadCount(res.unreadCount);
      })
      .catch(() => {});

    // Listen to real-time notification events
    const socket = getSocket();
    const handleNewNotif = () => {
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("notification:created", handleNewNotif);

    return () => {
      socket.off("notification:created", handleNewNotif);
    };
  }, [user]);

  if (!user) return null;

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    { label: "Notifications", href: "/notifications", icon: Bell, badge: unreadCount },
    { label: "Profile", href: "/profile", icon: UserIcon },
  ];

  if (user.role === "ADMIN") {
    navItems.push({ label: "Users Admin", href: "/users", icon: Users });
  }

  const roleBadgeColors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
    PROJECT_MANAGER: "bg-blue-100 text-blue-800 border-blue-200",
    TEAM_MEMBER: "bg-emerald-100 text-emerald-800 border-emerald-200",
    VIEWER: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-8">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-sm">
              N
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              NeoStats <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider">Collab</span>
            </span>
          </Link>

          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium text-slate-800">{user.name}</span>
            <span
              className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                roleBadgeColors[user.role] || "bg-slate-100 text-slate-700"
              }`}
            >
              {user.role.replace("_", " ")}
            </span>
          </div>

          <button
            onClick={() => logout()}
            title="Log out"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
