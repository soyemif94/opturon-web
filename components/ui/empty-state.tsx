import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] p-6 text-center",
        className
      )}
    >
      <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--border)] bg-card text-lg">
        {icon || "*"}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      {action ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

