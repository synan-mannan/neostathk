import React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full rounded-xl bg-card border border-border px-3.5 py-2 text-sm text-text transition-colors duration-200 focus:outline-none focus:border-highlight focus:ring-2 focus:ring-highlight/60 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none cursor-pointer",
          error && "border-danger focus:border-danger focus:ring-danger/60",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";
