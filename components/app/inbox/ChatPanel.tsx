import { useEffect, useMemo, useRef } from "react";
import { BotEventItem } from "@/components/app/inbox/BotEventItem";
import { Composer } from "@/components/app/inbox/Composer";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { MessageBubble } from "@/components/app/inbox/MessageBubble";
import { AutoSuggestBar } from "@/components/inbox/auto-suggest-bar";
import type { DetailPayload } from "@/components/app/inbox/types";
import type { SuggestionItem } from "@/lib/suggestions/getSuggestions";

function stageLabel(value?: string) {
  if (!value) return "Sin stage";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ChatPanel({
  detail,
  loading,
  composer,
  onComposerChange,
  onSend,
  readOnly,
  onSelectTemplate,
  suggestions,
  onSelectSuggestion,
  autoSuggestions,
  onRegenerateAutoSuggestions
}: {
  detail: DetailPayload | null;
  loading: boolean;
  composer: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  readOnly: boolean;
  onSelectTemplate: (text: string) => void;
  suggestions: SuggestionItem[];
  onSelectSuggestion: (item: SuggestionItem) => void;
  autoSuggestions: SuggestionItem[];
  onRegenerateAutoSuggestions: () => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  const timeline = useMemo(() => {
    if (!detail) return [] as Array<{ kind: "message" | "event"; id: string; payload: any }>;
    const messageItems = detail.messages.map((message) => ({ kind: "message" as const, id: message.id, payload: message }));
    const eventItems = detail.aiEvents.map((event) => ({ kind: "event" as const, id: event.id, payload: event }));
    return [...messageItems, ...eventItems].sort((a, b) => {
      const aTime = a.kind === "message" ? new Date(a.payload.timestamp).getTime() : new Date(a.payload.createdAt).getTime();
      const bTime = b.kind === "message" ? new Date(b.payload.timestamp).getTime() : new Date(b.payload.createdAt).getTime();
      return aTime - bTime;
    });
  }, [detail]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [timeline.length]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[color:var(--border)] bg-card shadow-sm">
      <header className="sticky top-0 z-10 rounded-t-2xl border-b border-[color:var(--border)] bg-card/95 p-4 backdrop-blur">
        {detail ? (
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{detail.contact?.name || "Conversación"}</h2>
              <p className="text-xs text-muted">{detail.contact?.phone || detail.contact?.email || "Sin dato de contacto"}</p>
            </div>
            <div className="flex items-center gap-2">
              {detail.conversation.priority === "hot" ? <InboxBadge>?? Hot</InboxBadge> : null}
              <InboxBadge>?? {stageLabel(detail.deal?.stage)}</InboxBadge>
              {readOnly ? <InboxBadge>?? Demo</InboxBadge> : null}
            </div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold">Chat</h2>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={`message-loading-${idx}`} className={`max-w-[70%] rounded-2xl px-4 py-3 ${idx % 2 === 0 ? "border border-[color:var(--border)] bg-card" : "ml-auto bg-muted"}`}>
                <div className="h-3 w-32 animate-pulse rounded bg-surface" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && !detail ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] text-center">
            <p className="text-2xl">??</p>
            <p className="mt-2 text-base font-semibold">Seleccioná una conversación</p>
            <p className="mt-1 text-xs text-muted">Elegí una fila de la columna izquierda para ver el hilo.</p>
          </div>
        ) : null}

        {!loading && detail ? (
          <div className="space-y-2">
            {timeline.map((item) =>
              item.kind === "message" ? (
                <MessageBubble
                  key={item.id}
                  direction={item.payload.direction}
                  text={item.payload.text}
                  timestamp={item.payload.timestamp}
                  optimistic={Boolean(item.payload.optimistic)}
                />
              ) : (
                <BotEventItem key={item.id} text={item.payload.text} />
              )
            )}
            <div ref={endRef} />
          </div>
        ) : null}
      </div>

      {detail ? (
        <div className="space-y-2 px-3 pb-3">
          <AutoSuggestBar suggestions={autoSuggestions} onSelect={onSelectSuggestion} onRegenerate={onRegenerateAutoSuggestions} />
          <Composer
            value={composer}
            onChange={onComposerChange}
            onSend={onSend}
            disabled={readOnly}
            quickReplies={detail.quickReplies}
            onPickQuickReply={onSelectTemplate}
            suggestions={suggestions}
            onSelectSuggestion={onSelectSuggestion}
          />
        </div>
      ) : null}
    </div>
  );
}
