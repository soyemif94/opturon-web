import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface/80", className)} />;
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 7 }).map((_, idx) => (
        <div key={`row-skeleton-${idx}`} className="rounded-2xl border border-[color:var(--border)] p-3">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="mt-2 h-3 w-2/5" />
          <div className="mt-3 flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={`profile-skeleton-${idx}`} className="rounded-2xl border border-[color:var(--border)] p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-3 h-3 w-4/5" />
          <Skeleton className="mt-2 h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}
