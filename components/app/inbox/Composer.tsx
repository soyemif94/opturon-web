import { useMemo, useState } from "react";
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
    <div className="sticky bottom-0 rounded-[24px] border border-[color:var(--border)] bg-card/95 p-3 shadow-[0_-12px_30px_rgba(0,0,0,0.12)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenTemplates((prev) => !prev)}
              className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text"
            >
              Templates
            </button>
            {openTemplates ? (
              <div className="absolute bottom-10 left-0 z-20 w-[320px] rounded-2xl border border-[color:var(--border)] bg-card p-3 shadow-[0_20px_40px_rgba(0,0,0,0.24)]">
                <input
                  value={templateSearch}
                  onChange={(event) => setTemplateSearch(event.target.value)}
                  className="mb-2 w-full rounded-xl border border-[color:var(--border)] bg-bg px-2.5 py-1.5 text-xs"
                  placeholder="Buscar template"
                />
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {visibleTemplates.map((item) => (
                    <button
                      key={item.intent}
                      type="button"
                      className="w-full rounded-xl border border-[color:var(--border)] px-2.5 py-2 text-left text-xs hover:bg-muted/50"
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
          <span className="text-xs text-muted">Enter envia · Shift+Enter salto de linea</span>
        </div>
      </div>

      <div className="flex gap-3">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="w-full rounded-[20px] border border-[color:var(--border)] bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand/40"
          placeholder="Escribe una respuesta para el cliente..."
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
          className="self-end rounded-[20px] bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Enviar
        </button>
      </div>

      <LiveSuggestions items={suggestions.slice(0, 5)} onSelect={onSelectSuggestion} />
    </div>
  );
}
