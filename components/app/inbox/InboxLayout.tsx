"use client";

import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
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
  return (
    <div className="flex flex-col pb-1 xl:min-h-[calc(100vh-13rem)]">
      <div className="grid grid-cols-1 gap-4 xl:min-h-[calc(100vh-13rem)] xl:grid-cols-[minmax(340px,0.92fr)_minmax(0,1.52fr)_minmax(320px,0.9fr)] 2xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.58fr)_minmax(340px,0.92fr)]">
        <aside
          className={cn(
            "min-h-[320px] min-w-0 overflow-hidden xl:min-h-0",
            hasDetail ? "hidden xl:block xl:min-h-0" : "block xl:min-h-0"
          )}
        >
          {left}
        </aside>

        <main
          className={cn(
            "min-w-0 flex-col gap-3 overflow-hidden xl:flex xl:min-h-0",
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
            "min-h-0 min-w-0 overflow-hidden",
            hasDetail ? "block" : "hidden xl:block"
          )}
        >
          <section className="min-h-[320px] overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] shadow-[0_24px_70px_rgba(0,0,0,0.24)] xl:h-full">
            <div className="overflow-y-auto p-4 xl:h-full">{right}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
