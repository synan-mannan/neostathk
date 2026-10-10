import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "highlight" | "primary" | "warning" | "danger" | "muted";
}

export const Badge = ({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) => {
  const variants = {
    default: "bg-card text-muted border-border",
    highlight: "bg-highlight/10 text-highlight border-highlight/30",
    primary: "bg-primary/20 text-highlight border-primary/40",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-danger/15 text-danger border-danger/30",
    muted: "bg-border/40 text-muted border-border/70",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
