import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary:
        "bg-primary text-text hover:bg-primary/90 hover:shadow-glow focus-visible:ring-2 focus-visible:ring-highlight/60 shadow-sm",
      secondary:
        "bg-card text-text border border-border hover:bg-border/40 hover:text-highlight focus-visible:ring-2 focus-visible:ring-highlight/40",
      outline:
        "bg-transparent text-text border border-border hover:bg-card hover:border-highlight/40 hover:text-highlight focus-visible:ring-2 focus-visible:ring-highlight/40",
      ghost:
        "bg-transparent text-muted hover:text-text hover:bg-card/70 focus-visible:ring-2 focus-visible:ring-highlight/40",
      destructive:
        "bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-danger/60",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-9 px-4 text-sm rounded-lg gap-2",
      lg: "h-11 px-6 text-base rounded-lg gap-2.5",
      icon: "h-9 w-9 p-0 rounded-lg justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none select-none motion-reduce:transition-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
