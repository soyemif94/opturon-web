import * as React from "react";
import { cn } from "@/lib/ui/cn";

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center rounded-lg border border-[color:var(--border)] bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground shadow-sm",
        className
      )}
      {...props}
    />
  );
}
