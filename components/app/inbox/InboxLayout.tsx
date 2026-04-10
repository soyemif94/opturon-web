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
    <div className="flex h-full min-h-0 flex-1 flex-col pb-1">
      <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.45fr)_minmax(320px,0.92fr)] 2xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.55fr)_minmax(340px,0.95fr)]">
        <aside
          className={cn(
            "h-full min-h-[320px] min-w-0 overflow-hidden",
            hasDetail ? "hidden xl:block xl:min-h-0" : "block xl:min-h-0"
          )}
        >
          {left}
        </aside>

        <main
          className={cn(
            "flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden",
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

          <section className="h-full min-h-[420px] min-w-0 flex-1 overflow-hidden xl:min-h-0">{center}</section>
        </main>

        <aside
          className={cn(
            "min-h-0 min-w-0 overflow-hidden",
            hasDetail ? "block" : "hidden xl:block"
          )}
        >
          <section className="h-full min-h-[320px] overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
            <div className="h-full overflow-y-auto p-4">{right}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
