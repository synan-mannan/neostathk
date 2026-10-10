import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-card/60 p-12 text-center flex flex-col items-center justify-center",
        className
      )}
    >
      <div className="h-12 w-12 rounded-full bg-border/40 text-muted flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-highlight/80" />
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mt-1 text-xs text-muted max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
