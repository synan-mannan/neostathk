"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
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
  Radio,
  Menu,
  X,
} from "lucide-react";

export function Navigation() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;

    // Fetch initial notification count
    apiFetch<{ success: boolean; unreadCount: number }>("api/notifications")
      .then((res) => {
        if (res.success) setUnreadCount(res.unreadCount);
      })
      .catch(() => { });

    // Listen to real-time notification events & socket connection state
    const socket = getSocket();
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const handleNewNotif = () => setUnreadCount((prev) => prev + 1);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("notification:created", handleNewNotif);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
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

  const roleVariant: Record<string, "highlight" | "primary" | "warning" | "default"> = {
    ADMIN: "highlight",
    PROJECT_MANAGER: "primary",
    TEAM_MEMBER: "default",
    VIEWER: "default",
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-6 sm:space-x-8">
          <Link href="/dashboard" className="flex items-center space-x-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold shadow-glow-sm transition-transform duration-200 group-hover:scale-105">
              C
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-text">
                Colab
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-highlight border border-primary/40 uppercase tracking-wider">
                Project
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-border/60 text-highlight shadow-sm"
                      : "text-muted hover:bg-border/30 hover:text-text"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-danger px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Real-time Socket Connection Status Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-bg/80 text-[11px] font-medium"
            title={isConnected ? "Real-time sync connected" : "Connecting to real-time server..."}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                isConnected ? "bg-highlight shadow-glow-sm" : "bg-muted animate-pulse"
              )}
            />
            <span className="hidden sm:inline text-muted text-[10px]">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs">
            <span className="font-medium text-text">{user.name}</span>
            <Badge variant={roleVariant[user.role] || "default"}>
              {user.role.replace("_", " ")}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            title="Log out"
            className="hidden sm:inline-flex text-muted hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-muted hover:text-text hover:bg-border/40"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 pt-3 pb-5 space-y-2">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <span className="text-xs font-semibold text-text">{user.name}</span>
            <Badge variant={roleVariant[user.role] || "default"}>
              {user.role.replace("_", " ")}
            </Badge>
          </div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg",
                    isActive
                      ? "bg-border text-highlight"
                      : "text-muted hover:bg-border/40 hover:text-text"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="rounded-full bg-danger px-1.5 py-0.2 text-[10px] text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="pt-2 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full justify-center"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
