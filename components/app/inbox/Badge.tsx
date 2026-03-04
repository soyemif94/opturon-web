import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function InboxBadge({
  className,
  children,
  active
}: {
  className?: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        active ? "border-brand/50 bg-brand/10 text-text" : "border-[color:var(--border)] text-muted",
        className
      )}
    >
      {children}
    </span>
  );
}
