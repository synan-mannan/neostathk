import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "w-full rounded-xl bg-card border border-border px-3.5 py-2 text-sm text-text placeholder:text-muted transition-colors duration-200 focus:outline-none focus:border-highlight focus:ring-2 focus:ring-highlight/60 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none",
          error && "border-danger focus:border-danger focus:ring-danger/60",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
