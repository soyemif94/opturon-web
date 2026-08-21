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
    <div className="relative flex min-h-0 flex-col pb-1 xl:h-[calc(100vh-10.75rem)] xl:min-h-[42rem]">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.72fr)] 2xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.58fr)_minmax(300px,0.76fr)]">
        <aside
          className={cn(
            "min-h-[34rem] min-w-0 overflow-hidden xl:min-h-0",
            hasDetail ? "hidden xl:block xl:min-h-0" : "block xl:min-h-0"
          )}
        >
          {left}
        </aside>

        <main
          className={cn(
            "min-h-[34rem] min-w-0 flex-col gap-2 overflow-hidden xl:flex xl:min-h-0",
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

          <section className="min-h-[420px] min-w-0 overflow-hidden xl:min-h-0 xl:flex-1">{center}</section>
        </main>

        <aside
          className={cn(
            "hidden min-h-0 min-w-0 overflow-hidden 2xl:block",
            hasDetail ? "2xl:block" : "2xl:hidden"
          )}
        >
          <section className="h-full min-h-[320px] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-card/70 shadow-[0_18px_55px_rgba(0,0,0,0.2)]">
            <div className="h-full overflow-y-auto p-3">{right}</div>
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
            <div className="min-h-0 flex-1 overflow-y-auto p-3">{right}</div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
