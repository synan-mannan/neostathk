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
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Project
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Project Audit & Activity Log
          </h1>
          <p className="text-xs text-slate-500">
            All database modifications recorded with timestamp and actor.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
          <Activity className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No activity logged</h3>
          <p className="mt-1 text-sm text-slate-500">
            Operations like task creation, status changes, and comments will show up here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {activities.map((act) => (
            <div key={act.id} className="p-4 sm:px-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {act.user_name || "System"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700">
                    {act.action.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Target entity: <strong className="text-slate-800">{act.entity_type}</strong>
                </p>
                {act.metadata && Object.keys(act.metadata).length > 0 && (
                  <pre className="mt-1 rounded bg-slate-50 p-2 text-[11px] text-slate-600 max-w-xl overflow-x-auto border border-slate-100">
                    {JSON.stringify(act.metadata, null, 2)}
                  </pre>
                )}
              </div>

              <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
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
