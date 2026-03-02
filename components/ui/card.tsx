import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "card-opt transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.24)]",
        className
      )}
      {...props}
    />
  );
}
