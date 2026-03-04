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
    <section className={cn("rounded-2xl border border-[color:var(--border)] bg-card p-4 shadow-sm", className)}>
      <header className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
