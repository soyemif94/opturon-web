import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface/80", className)} />;
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 7 }).map((_, idx) => (
        <div key={`row-skeleton-${idx}`} className="flex items-center gap-2.5 rounded-xl p-2.5">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="mt-2 h-2.5 w-4/5" />
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={`profile-skeleton-${idx}`} className="rounded-xl border border-[color:var(--border)] p-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-3 h-3 w-4/5" />
          <Skeleton className="mt-2 h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}
