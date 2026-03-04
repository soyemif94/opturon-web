"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { SuggestionItem } from "@/lib/suggestions/getSuggestions";

const STORAGE_KEY = "opturon:autosuggest:hidden";

export function AutoSuggestBar({
  suggestions,
  onSelect,
  onRegenerate
}: {
  suggestions: SuggestionItem[];
  onSelect: (item: SuggestionItem) => void;
  onRegenerate: () => void;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setHidden(raw === "1");
    } catch {}
  }, []);

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
  }

  const visible = useMemo(() => suggestions.slice(0, 6), [suggestions]);
  if (hidden) return null;

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Sugerencias por el ultimo mensaje</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRegenerate} className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs hover:bg-muted">
            Regenerar
          </button>
          <button type="button" onClick={toggleHidden} className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs hover:bg-muted">
            Ocultar
          </button>
        </div>
      </div>

      {visible.length ? (
        <div className="flex flex-wrap gap-2">
          {visible.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onClick={() => onSelect(item)}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs hover:bg-muted"
            >
              {item.type === "template" ? `Template: ${item.label}` : null}
              {item.type === "product" ? `Producto: ${item.label}` : null}
              {item.type === "action" ? `Accion: ${item.label}` : null}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          className="min-h-[90px] border-0 p-0"
          icon="[]"
          title="Sin sugerencias"
          description="Usa Templates o Ctrl+K"
        />
      )}
    </div>
  );
}

