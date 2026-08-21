import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Bot, Clock3, MoreHorizontal, PanelRight, Pause, Play, Sparkles, Trash2, UserRound } from "lucide-react";
import { BotEventItem } from "@/components/app/inbox/BotEventItem";
import { Composer } from "@/components/app/inbox/Composer";
import { MessageBubble } from "@/components/app/inbox/MessageBubble";
import { SimpleAvatar } from "@/components/app/simple-avatar";
import { AutoSuggestBar } from "@/components/inbox/auto-suggest-bar";
import type { BotDomainOverride, BotFlowLock, DetailPayload } from "@/components/app/inbox/types";
import type { SuggestionItem } from "@/lib/suggestions/getSuggestions";

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
  canDeleteConversation: boolean;
  onDeleteConversation: () => void;
  onOpenContext: () => void;
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
  onRegenerateAutoSuggestions,
  onToggleBot,
  onTakeConversation,
  onArchive,
  canDeleteConversation,
  onDeleteConversation,
  onOpenContext
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <header className="shrink-0 border-b border-[color:var(--border)] bg-surface/45 px-3 py-2.5 backdrop-blur sm:px-4">
        {detail ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <SimpleAvatar
                src={detail.contact?.profileImageUrl}
                name={detail.contact?.name || detail.contact?.phone || "Cliente"}
                className="size-10 rounded-full border border-white/10 bg-brand/10 text-xs text-brandBright"
                fallbackClassName="bg-brand/10 text-brandBright"
              />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-base font-semibold">{detail.contact?.name || detail.contact?.phone || "Conversacion"}</h2>
                  <span className={`hidden h-5 shrink-0 items-center rounded-full border px-2 text-[9px] sm:inline-flex ${isInstagramConversation ? "border-fuchsia-400/25 text-fuchsia-100" : "border-emerald-400/25 text-emerald-100"}`}>{isInstagramConversation ? "Instagram" : "WhatsApp"}</span>
                  <span className={`size-2 shrink-0 rounded-full ${detail.conversation.botEnabled ? "bg-emerald-400" : "bg-amber-400"}`} aria-label={detail.conversation.botEnabled ? "Bot activo" : "Bot pausado"} />
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted">
                  {statusLabel(detail)} · {detail.contact?.phone || detail.contact?.email || "Sin dato de contacto"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleBot}
                disabled={readOnly}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition disabled:opacity-40 ${detail.conversation.botEnabled ? "border-amber-400/25 bg-amber-400/8 text-amber-100 hover:bg-amber-400/14" : "border-emerald-400/25 bg-emerald-400/8 text-emerald-100 hover:bg-emerald-400/14"}`}
                aria-label={detail.conversation.botEnabled ? "Pausar bot para esta conversación" : "Retomar bot para esta conversación"}
              >
                {detail.conversation.botEnabled ? <Pause aria-hidden="true" className="size-3.5" /> : <Play aria-hidden="true" className="size-3.5" />}
                <span className="hidden sm:inline">{detail.conversation.botEnabled ? "Pausar bot" : "Retomar bot"}</span>
              </button>
              <button type="button" onClick={onOpenContext} className="inline-flex size-8 items-center justify-center rounded-full border border-[color:var(--border)] text-muted hover:text-text 2xl:hidden" aria-label="Abrir contexto del contacto">
                <PanelRight aria-hidden="true" className="size-4" />
              </button>
              <details className="relative">
                <summary className="inline-flex size-8 cursor-pointer list-none items-center justify-center rounded-full border border-[color:var(--border)] text-muted hover:text-text" aria-label="Más acciones">
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </summary>
                <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-[color:var(--border)] bg-card p-1.5 shadow-xl">
                  <button type="button" onClick={onTakeConversation} disabled={readOnly} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-muted/40 hover:text-text disabled:opacity-40"><UserRound aria-hidden="true" className="size-3.5" />Tomar para mí</button>
                  <button type="button" onClick={onArchive} disabled={readOnly} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-muted/40 hover:text-text disabled:opacity-40"><Archive aria-hidden="true" className="size-3.5" />Archivar</button>
                  {canDeleteConversation ? <button type="button" onClick={onDeleteConversation} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-red-300 hover:bg-red-500/10 hover:text-red-200"><Trash2 aria-hidden="true" className="size-3.5" />Eliminar conversación</button> : null}
                </div>
              </details>
            </div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold">Inbox</h2>
        )}
      </header>

      <div
        ref={scrollViewportRef}
        className="app-scroll-surface min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,rgba(176,80,0,0.035),transparent_25%)] px-3 py-4 sm:px-5"
        tabIndex={0}
        aria-label="Mensajes de la conversación"
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
          <div className="mx-auto max-w-4xl space-y-2.5">
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

            {!loading && timeline.length === 0 ? (
              <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-card/35 px-5 text-center">
                <Bot aria-hidden="true" className="size-6 text-muted" />
                <p className="mt-3 text-sm font-semibold">Esta conversación todavía no tiene mensajes</p>
                <p className="mt-1 text-xs text-muted">Cuando llegue o se envíe un mensaje, aparecerá en este hilo.</p>
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
                  status={item.payload.status}
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
        <div className="shrink-0 space-y-1.5 border-t border-[color:var(--border)] bg-surface/35 px-2.5 py-2 sm:px-3">
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
