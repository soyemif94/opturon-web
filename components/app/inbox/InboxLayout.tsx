"use client";

import { ChevronLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function InboxLayout({
  left,
  center,
  right,
  hasDetail = false,
  onBackToList,
  contextOpen = false,
  onCloseContext
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  hasDetail?: boolean;
  onBackToList?: () => void;
  contextOpen?: boolean;
  onCloseContext?: () => void;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-[color:var(--border)] bg-card/20">
      <div className="relative grid h-full min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(290px,330px)_minmax(0,1fr)_minmax(280px,320px)]">
        <aside
          className={cn(
            "h-full min-h-0 min-w-0 overflow-hidden xl:border-r xl:border-[color:var(--border)]",
            hasDetail ? "invisible pointer-events-none absolute inset-0 xl:visible xl:pointer-events-auto xl:static xl:block" : "block"
          )}
        >
          {left}
        </aside>

        <main
          className={cn(
            "h-full min-h-0 min-w-0 flex-col overflow-hidden xl:flex",
            hasDetail ? "flex" : "hidden xl:flex"
          )}
        >
          {onBackToList ? (
            <div className="border-b border-[color:var(--border)] px-3 py-2 xl:hidden">
              <button
                type="button"
                onClick={onBackToList}
                className="inline-flex h-8 items-center gap-2 rounded-lg px-2 text-xs font-medium text-muted transition-colors hover:bg-muted/25 hover:text-text"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Volver a conversaciones
              </button>
            </div>
          ) : null}

          <section className="min-h-0 min-w-0 flex-1 overflow-hidden">{center}</section>
        </main>

        <aside
          className={cn(
            "hidden min-h-0 min-w-0 overflow-hidden border-l border-[color:var(--border)] 2xl:block",
            hasDetail ? "2xl:block" : "2xl:hidden"
          )}
        >
          <section className="h-full min-h-[320px] overflow-hidden">
            <div className="app-scroll-surface h-full overflow-x-hidden overflow-y-auto overscroll-contain" tabIndex={0} aria-label="Contexto de la conversación">{right}</div>
          </section>
        </aside>
      </div>

      {hasDetail && contextOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-sm 2xl:hidden" role="dialog" aria-modal="true" aria-label="Contexto del contacto">
          <button type="button" className="min-w-0 flex-1 cursor-default" aria-label="Cerrar contexto" onClick={onCloseContext} />
          <aside className="flex h-full w-full max-w-[24rem] flex-col border-l border-[color:var(--border)] bg-background shadow-2xl">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--border)] px-4">
              <div>
                <p className="text-sm font-semibold">Contexto del contacto</p>
                <p className="text-[11px] text-muted">Datos y acciones de esta conversación</p>
              </div>
              <button type="button" onClick={onCloseContext} className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--border)] text-muted hover:text-text" aria-label="Cerrar contexto">
                <X aria-hidden="true" className="size-4" />
              </button>
            </header>
            <div className="app-scroll-surface min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3" tabIndex={0} aria-label="Contexto de la conversación">{right}</div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
