import type { ReactNode } from "react";

export function InboxLayout({
  left,
  center,
  right
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[980px] grid-cols-[300px_minmax(760px,1fr)] items-stretch gap-3 xl:h-[calc(100vh-116px)] xl:min-h-[700px]">
        <aside className="min-h-[280px] min-w-0 overflow-hidden xl:min-h-0">{left}</aside>
        <main className="flex min-h-[420px] min-w-0 flex-col gap-3 overflow-hidden xl:min-h-0">
          <section className="min-h-[420px] min-w-0 flex-1 overflow-hidden">{center}</section>
          <section className="min-h-[220px] min-w-0 overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
            <div className="border-b border-[color:var(--border)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Contexto</p>
              <p className="mt-1 text-sm text-muted">Asignacion, estado y metadata de la conversacion.</p>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-4">
              {right}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
