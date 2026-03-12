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
        "rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.14)]",
        className
      )}
    >
      <header className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs leading-5 text-muted">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}
