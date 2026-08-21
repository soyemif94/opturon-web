import { useMemo, useState } from "react";
import { Send, TextQuote } from "lucide-react";
import { LiveSuggestions } from "@/components/inbox/live-suggestions";
import type { SuggestionItem } from "@/lib/suggestions/getSuggestions";

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  quickReplies,
  onPickQuickReply,
  suggestions,
  onSelectSuggestion
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  quickReplies: Array<{ intent: string; text: string }>;
  onPickQuickReply: (text: string) => void;
  suggestions: SuggestionItem[];
  onSelectSuggestion: (item: SuggestionItem) => void;
}) {
  const [openTemplates, setOpenTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");

  const visibleTemplates = useMemo(() => {
    const term = templateSearch.toLowerCase().trim();
    if (!term) return quickReplies;
    return quickReplies.filter((item) => `${item.intent} ${item.text}`.toLowerCase().includes(term));
  }, [quickReplies, templateSearch]);

  return (
    <div className="sticky bottom-0 bg-transparent">
      <div className="flex items-end gap-2">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpenTemplates((prev) => !prev)}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-[color:var(--border)] bg-surface/70 text-muted hover:text-text"
            aria-label="Abrir templates"
            aria-expanded={openTemplates}
          >
            <TextQuote aria-hidden="true" className="size-4" />
          </button>
          {openTemplates ? (
            <div className="absolute bottom-11 left-0 z-20 w-[min(320px,calc(100vw-3rem))] rounded-xl border border-[color:var(--border)] bg-card p-3 shadow-[0_20px_40px_rgba(0,0,0,0.24)]">
              <input
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                className="mb-2 w-full rounded-lg border border-[color:var(--border)] bg-bg px-2.5 py-1.5 text-xs"
                placeholder="Buscar template"
                aria-label="Buscar template"
              />
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {visibleTemplates.map((item) => (
                  <button
                    key={item.intent}
                    type="button"
                    className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left text-xs hover:border-[color:var(--border)] hover:bg-muted/30"
                    onClick={() => {
                      onPickQuickReply(item.text);
                      setOpenTemplates(false);
                      setTemplateSearch("");
                    }}
                  >
                    <p className="font-medium">{item.intent}</p>
                    <p className="mt-0.5 line-clamp-2 text-muted">{item.text}</p>
                  </button>
                ))}
                {visibleTemplates.length === 0 ? <p className="py-3 text-center text-xs text-muted">Sin resultados</p> : null}
              </div>
            </div>
          ) : null}
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={1}
          className="max-h-28 min-h-9 min-w-0 flex-1 resize-none rounded-xl border border-[color:var(--border)] bg-bg px-3 py-2 text-sm outline-none focus:border-brand/40"
          placeholder="Escribí una respuesta…"
          aria-label="Respuesta"
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_12px_24px_rgba(176,80,0,0.22)] disabled:opacity-40"
          aria-label="Enviar mensaje"
        >
          <Send aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-muted">
        <span>Enter envía · Shift+Enter crea una línea</span>
        {disabled ? <span>No disponible</span> : null}
      </div>

      <LiveSuggestions items={suggestions.slice(0, 5)} onSelect={onSelectSuggestion} />
    </div>
  );
}
