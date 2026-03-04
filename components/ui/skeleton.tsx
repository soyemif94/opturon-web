import { cn } from "@/lib/ui/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn("h-3 w-full", className)} />;
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[color:var(--border)] bg-card p-4", className)}>
      <SkeletonLine className="w-2/5" />
      <SkeletonLine className="mt-2 w-4/5" />
      <SkeletonLine className="mt-2 w-3/5" />
    </div>
  );
}

