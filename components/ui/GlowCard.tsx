import { cn } from "@/lib/cn";

type GlowCardProps = {
  className?: string;
  children: React.ReactNode;
};

export function GlowCard({ className, children }: GlowCardProps) {
  return (
    <article
      className={cn(
        "group rounded-2xl border border-[color:var(--border)] bg-card/95 p-6 transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-brand/60 hover:shadow-brand",
        className
      )}
    >
      {children}
    </article>
  );
}

