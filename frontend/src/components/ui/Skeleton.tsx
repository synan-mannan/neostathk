import React from "react";
import { cn } from "@/lib/utils";

export const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-border/40 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
};
