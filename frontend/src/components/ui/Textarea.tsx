import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl bg-card border border-border px-3.5 py-2.5 text-sm text-text placeholder:text-muted transition-colors duration-200 focus:outline-none focus:border-highlight focus:ring-2 focus:ring-highlight/60 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none",
          error && "border-danger focus:border-danger focus:ring-danger/60",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
