export default function AppLoading() {
  return (
    <div className="flex min-h-screen w-full bg-[color:var(--bg)] px-5 py-5 text-[color:var(--text)]">
      <div className="flex w-full gap-5">
        <aside className="hidden w-[304px] shrink-0 xl:block">
          <div className="h-[calc(100vh-40px)] animate-pulse rounded-[30px] border border-[color:var(--border)] bg-card/70" />
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-card/60 shadow-[0_32px_120px_rgba(0,0,0,0.18)]">
          <div className="border-b border-[color:var(--border)] px-5 py-5 xl:px-8">
            <div className="h-3 w-32 animate-pulse rounded-full bg-surface/90" />
            <div className="mt-3 h-8 w-80 animate-pulse rounded-full bg-surface/90" />
          </div>
          <div className="space-y-4 p-5 xl:p-8">
            <div className="h-28 animate-pulse rounded-[28px] bg-surface/80" />
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="h-44 animate-pulse rounded-[28px] bg-surface/80" />
              <div className="h-44 animate-pulse rounded-[28px] bg-surface/80" />
            </div>
            <div className="h-56 animate-pulse rounded-[28px] bg-surface/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
