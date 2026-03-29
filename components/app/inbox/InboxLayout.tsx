"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";

export function InboxLayout({
  left,
  center,
  right
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}) {
  const [contextExpanded, setContextExpanded] = useState(false);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[980px] grid-cols-[300px_minmax(760px,1fr)] items-stretch gap-3 xl:h-[calc(100vh-116px)] xl:min-h-[700px]">
        <aside className="min-h-[280px] min-w-0 overflow-hidden xl:min-h-0">{left}</aside>
        <main className="flex min-h-[420px] min-w-0 flex-col gap-3 overflow-hidden xl:min-h-0">
          <section className="min-h-[420px] min-w-0 flex-1 overflow-hidden">{center}</section>
          <section className="shrink-0 overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.015))] shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
            <button
              type="button"
              onClick={() => setContextExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Contexto</p>
                <p className="mt-1 text-sm text-muted">
                  {contextExpanded
                    ? "Asignacion, estado y metadata de la conversacion."
                    : "Mostra asignacion, estado, notas y tareas sin quitar foco al hilo."}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted">
                {contextExpanded ? (
                  <>
                    Ocultar contexto
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Ver contexto
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </span>
            </button>
            <div className={contextExpanded ? "border-t border-[color:var(--border)]" : "hidden"}>
              <div className="max-h-[280px] overflow-y-auto p-4">
                {right}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
