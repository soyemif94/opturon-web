import { cn } from "@/lib/cn";
import { getCardGlowClass, type CardGlow } from "@/components/ui/card";

type GlowCardProps = {
  className?: string;
  glow?: CardGlow;
  children: React.ReactNode;
};

export function GlowCard({ className, glow = "green", children }: GlowCardProps) {
  return (
    <article
      className={cn(
        "group rounded-2xl border border-[color:var(--border)] bg-card/95 p-6",
        getCardGlowClass(glow),
        className
      )}
    >
      {children}
    </article>
  );
}

