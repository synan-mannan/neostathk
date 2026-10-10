"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Bell, CheckCheck, Clock, Check } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  entity_type: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; notifications: NotificationItem[] }>(
        "api/notifications"
      );
      if (res.success) setNotifications(res.notifications);
    } catch (err: any) {
      console.error("Error loading notifications:", err);
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
      fetchNotifications();

      const socket = getSocket();
      const onNewNotif = (notif: NotificationItem) => {
        setNotifications((prev) => [notif, ...prev]);
      };

      socket.on("notification:created", onNewNotif);

      return () => {
        socket.off("notification:created", onNewNotif);
      };
    }
  }, [user, authLoading, router]);

  const markAsRead = async (id: string) => {
    try {
      await apiFetch(`api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err: any) {
      console.error("Error marking read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch("api/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err: any) {
      console.error("Error marking all read:", err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
            <Bell className="h-6 w-6 text-highlight" />
            Notifications
          </h1>
          <p className="text-xs text-muted">
            Real-time notifications for task assignments, mentions, and updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-text shadow-sm hover:bg-border/40"
          >
            <CheckCheck className="h-4 w-4 text-highlight" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card">
          <Bell className="mx-auto h-10 w-10 text-muted" />
          <h3 className="mt-3 text-base font-semibold text-text">All caught up!</h3>
          <p className="mt-1 text-sm text-muted">
            You don't have any notifications right now.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 sm:px-6 flex items-start justify-between gap-4 transition-colors ${
                notif.is_read ? "bg-card" : "bg-highlight/5"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      notif.is_read ? "bg-muted/50" : "bg-highlight shadow-glow-sm"
                    }`}
                  />
                  <p className="text-sm font-medium text-text">{notif.message}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted pl-4">
                  <span className="capitalize">{notif.type.replace(/_/g, " ").toLowerCase()}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  title="Mark as read"
                  className="rounded-lg p-1 text-muted hover:text-highlight hover:bg-highlight/10 transition-colors duration-200 motion-reduce:transition-none"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
