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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" />
            Notifications
          </h1>
          <p className="text-xs text-slate-500">
            Real-time notifications for task assignments, mentions, and updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <CheckCheck className="h-4 w-4 text-emerald-600" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <Bell className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">All caught up!</h3>
          <p className="mt-1 text-sm text-slate-500">
            You don't have any notifications right now.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 sm:px-6 flex items-start justify-between gap-4 transition-colors ${
                notif.is_read ? "bg-white" : "bg-indigo-50/30"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      notif.is_read ? "bg-slate-300" : "bg-indigo-600"
                    }`}
                  />
                  <p className="text-sm font-medium text-slate-900">{notif.message}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 pl-4">
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
                  className="rounded p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
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
