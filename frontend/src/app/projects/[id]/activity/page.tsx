"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Activity, ArrowLeft, Clock } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  user_name?: string;
  created_at: string;
  metadata: any;
}

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "";
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; activities: ActivityItem[] }>(
        `api/projects/${projectId}/activity`
      );
      if (res.success) setActivities(res.activities);
    } catch (err: any) {
      console.error("Error loading activity:", err);
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
      fetchActivities();

      const socket = getSocket();
      socket.emit("subscribe:project", projectId);

      const onActivityCreated = (act: ActivityItem) => {
        setActivities((prev) => [act, ...prev]);
      };

      socket.on("activity:created", onActivityCreated);

      return () => {
        socket.off("activity:created", onActivityCreated);
        socket.emit("unsubscribe:project", projectId);
      };
    }
  }, [user, authLoading, projectId, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-highlight hover:text-primary transition-colors duration-200 motion-reduce:transition-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Project
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">
            Project Audit & Activity Log
          </h1>
          <p className="text-xs text-muted">
            All database modifications recorded with timestamp and actor.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card">
          <Activity className="mx-auto h-10 w-10 text-muted" />
          <h3 className="mt-3 text-base font-semibold text-text">No activity logged</h3>
          <p className="mt-1 text-sm text-muted">
            Operations like task creation, status changes, and comments will show up here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
          {activities.map((act) => (
            <div key={act.id} className="p-4 sm:px-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text text-sm">
                    {act.user_name || "System"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-semibold bg-primary/15 text-highlight">
                    {act.action.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Target entity: <strong className="text-text">{act.entity_type}</strong>
                </p>
                {act.metadata && Object.keys(act.metadata).length > 0 && (
                  <dl className="mt-1 grid max-w-xl grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-border bg-bg p-2 text-[11px]">
                    {Object.entries(act.metadata).map(([key, value]) => (
                      <div key={key} className="contents">
                        <dt className="capitalize text-muted">{key.replace(/[_-]+/g, " ")}</dt>
                        <dd className="break-words text-text">
                          {value === null || value === undefined || value === ""
                            ? "—"
                            : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              <span className="text-xs text-muted flex items-center gap-1 shrink-0">
                <Clock className="h-3.5 w-3.5" />
                {new Date(act.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
