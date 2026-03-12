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
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        active
          ? "border-brand/50 bg-brand/12 text-text shadow-[0_0_0_1px_rgba(192,80,0,0.10)]"
          : "border-[color:var(--border)] bg-surface/80 text-muted",
        className
      )}
    >
      {children}
    </span>
  );
}
