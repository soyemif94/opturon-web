"use client";

import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function InboxLayout({
  left,
  center,
  right,
  hasDetail = false,
  onBackToList
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  hasDetail?: boolean;
  onBackToList?: () => void;
}) {
  const [contextExpanded, setContextExpanded] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-1">
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-3 xl:h-[calc(100vh-172px)] xl:min-h-[760px] xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={cn(
            "min-h-[320px] min-w-0 overflow-hidden",
            hasDetail ? "hidden xl:block xl:min-h-0" : "block xl:min-h-0"
          )}
        >
          {left}
        </aside>
        <main
          className={cn(
            "min-h-0 min-w-0 flex-col gap-3 overflow-hidden",
            hasDetail ? "flex" : "hidden xl:flex"
          )}
        >
          {onBackToList ? (
            <div className="xl:hidden">
              <button
                type="button"
                onClick={onBackToList}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-card/70 px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-text"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Volver a conversaciones
              </button>
            </div>
          ) : null}

          <section className="min-h-[420px] min-w-0 flex-1 overflow-hidden xl:min-h-0">{center}</section>
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
              <div className="max-h-[240px] overflow-y-auto p-4 xl:max-h-[220px]">
                {right}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
