import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function CardSection({
  title,
  subtitle,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-[color:var(--border)] bg-surface/35 p-3",
        className
      )}
    >
      <header className="mb-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</h3>
        {subtitle ? <p className="mt-1 text-[11px] leading-4 text-muted/80">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
