import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Sparkles } from "lucide-react";
import { BotEventItem } from "@/components/app/inbox/BotEventItem";
import { Composer } from "@/components/app/inbox/Composer";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { MessageBubble } from "@/components/app/inbox/MessageBubble";
import { SimpleAvatar } from "@/components/app/simple-avatar";
import { AutoSuggestBar } from "@/components/inbox/auto-suggest-bar";
import type { BotDomainOverride, BotFlowLock, DetailPayload } from "@/components/app/inbox/types";
import type { SuggestionItem } from "@/lib/suggestions/getSuggestions";

function stageLabel(value?: string) {
  if (!value) return "Sin etapa";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusLabel(detail: DetailPayload) {
  if (detail.conversation.status === "new") return "nueva";
  if (detail.conversation.status === "closed") return "resuelta";
  if (detail.conversation.unreadCount > 0) return "esperando respuesta";
  return "activa";
}

type ChatPanelProps = {
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
  onToggleBot: () => void;
  onTakeConversation: () => void;
  onArchive: () => void;
  onBotFlowLockChange: (value: BotFlowLock) => void;
  onBotDomainOverrideChange: (value: BotDomainOverride) => void;
};

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
}: ChatPanelProps) {
  const COLLAPSED_TIMELINE_ITEMS = 12;
  const endRef = useRef<HTMLDivElement | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);

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

  const hasCollapsibleHistory = timeline.length > COLLAPSED_TIMELINE_ITEMS;
  const visibleTimeline = historyExpanded || !hasCollapsibleHistory ? timeline : timeline.slice(-COLLAPSED_TIMELINE_ITEMS);
  const lastTimelineKey = visibleTimeline[visibleTimeline.length - 1]?.id || null;
  const isInstagramConversation = detail?.conversation.channelType === "instagram";
  const isComposerDisabled = readOnly || isInstagramConversation;

  useEffect(() => {
    setHistoryExpanded(false);
  }, [detail?.conversation.id]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const conversationId = detail?.conversation.id || null;
    const conversationChanged = previousConversationIdRef.current !== conversationId;
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const shouldStickToBottom = conversationChanged || distanceFromBottom < 120;

    previousConversationIdRef.current = conversationId;
    if (!shouldStickToBottom) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: conversationChanged ? "auto" : "smooth"
    });
  }, [detail?.conversation.id, lastTimelineKey, timeline.length]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
      <header className="shrink-0 border-b border-[color:var(--border)] bg-surface/94 px-4 py-4 backdrop-blur">
        {detail ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <SimpleAvatar
                src={detail.contact?.profileImageUrl}
                name={detail.contact?.name || detail.contact?.phone || "Cliente"}
                className="h-12 w-12 rounded-full border border-white/10 bg-brand/10 text-sm text-brandBright shadow-[0_14px_30px_rgba(0,0,0,0.2)]"
                fallbackClassName="bg-brand/10 text-brandBright"
              />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">{detail.contact?.name || detail.contact?.phone || "Conversacion"}</h2>
                <p className="mt-0.5 text-xs text-muted">{detail.contact?.phone || detail.contact?.email || "Sin dato de contacto"}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <InboxBadge className="capitalize">{statusLabel(detail)}</InboxBadge>
              <InboxBadge className={isInstagramConversation ? "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100" : ""}>
                {isInstagramConversation ? "Instagram" : "WhatsApp"}
              </InboxBadge>
              {detail.conversation.importedHistory ? <InboxBadge className="border-emerald-300/25 bg-emerald-300/10 text-emerald-100">Historial importado</InboxBadge> : null}
              <InboxBadge>{stageLabel(detail.deal?.stage)}</InboxBadge>
              {!detail.conversation.botEnabled ? <InboxBadge className="border-amber-400/30 bg-amber-400/10 text-amber-100">Bot pausado</InboxBadge> : null}
              {readOnly ? <InboxBadge active>Demo</InboxBadge> : null}
            </div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold">Inbox</h2>
        )}
      </header>

      <div
        ref={scrollViewportRef}
        className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(176,80,0,0.07),transparent_22%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.02))] px-4 py-5"
      >
        {loading && !detail ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={`message-loading-${idx}`}
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${idx % 2 === 0 ? "border border-[color:var(--border)] bg-card" : "ml-auto bg-muted"}`}
              >
                <div className="h-3 w-32 animate-pulse rounded bg-surface" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && !detail ? (
          <div className="flex h-full min-h-[340px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[color:var(--border)] bg-card/40 text-center">
            <MessageSquareEmpty />
            <p className="mt-3 text-base font-semibold">Selecciona una conversacion</p>
            <p className="mt-1 max-w-sm text-xs leading-6 text-muted">Abre una fila de la izquierda para leer el hilo, responder y seguir el contacto.</p>
          </div>
        ) : null}

        {detail ? (
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-[18px] border border-[color:var(--border)] bg-card/55 px-3 py-2 text-[11px] text-muted">
                Actualizando conversacion...
              </div>
            ) : null}

            {hasCollapsibleHistory ? (
              <div className="rounded-[20px] border border-[color:var(--border)] bg-card/45 px-3 py-2.5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-[11px] text-muted">
                    <Clock3 className="h-3.5 w-3.5" />
                    {historyExpanded
                      ? `Mostrando el historial completo (${timeline.length} mensajes).`
                      : `Mostrando los ultimos ${visibleTimeline.length} mensajes de ${timeline.length}.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setHistoryExpanded((current) => !current)}
                    className="inline-flex items-center justify-center rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-muted transition hover:text-text"
                  >
                    {historyExpanded ? "Contraer historial" : "Ver historial completo"}
                  </button>
                </div>
              </div>
            ) : null}

            {visibleTimeline.map((item) =>
              item.kind === "message" ? (
                <MessageBubble
                  key={item.id}
                  direction={item.payload.direction}
                  type={item.payload.type}
                  text={item.payload.text}
                  caption={item.payload.caption}
                  timestamp={item.payload.timestamp}
                  media={item.payload.media}
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
        <div className="shrink-0 space-y-2 border-t border-[color:var(--border)] bg-surface/90 px-3 pb-3 pt-2">
          {isInstagramConversation ? (
            <div className="rounded-[18px] border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-2 text-xs text-fuchsia-50">
              Instagram esta disponible en modo lectura en esta etapa. Respuesta desde Instagram todavia no disponible.
            </div>
          ) : (
            <AutoSuggestBar suggestions={autoSuggestions} onSelect={onSelectSuggestion} onRegenerate={onRegenerateAutoSuggestions} />
          )}
          <Composer
            value={composer}
            onChange={onComposerChange}
            onSend={onSend}
            disabled={isComposerDisabled}
            quickReplies={isInstagramConversation ? [] : detail.quickReplies}
            onPickQuickReply={onSelectTemplate}
            suggestions={isInstagramConversation ? [] : suggestions}
            onSelectSuggestion={onSelectSuggestion}
          />
        </div>
      ) : null}
    </div>
  );
}

function MessageSquareEmpty() {
  return (
    <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-[color:var(--border)] bg-surface/70">
      <Sparkles className="h-5 w-5 text-brandBright" />
    </div>
  );
}
