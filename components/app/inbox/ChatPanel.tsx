import { useEffect, useMemo, useRef } from "react";
import { Bot, Hand, LoaderCircle, PauseCircle, PhoneCall, Sparkles, UserRound, Wrench } from "lucide-react";
import { BotEventItem } from "@/components/app/inbox/BotEventItem";
import { Composer } from "@/components/app/inbox/Composer";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { MessageBubble } from "@/components/app/inbox/MessageBubble";
import { AutoSuggestBar } from "@/components/inbox/auto-suggest-bar";
import type { DetailPayload } from "@/components/app/inbox/types";
import type { SuggestionItem } from "@/lib/suggestions/getSuggestions";

type ChannelBinding = NonNullable<DetailPayload["channelBinding"]>;
type BoundChannel = ChannelBinding["conversationChannel"] | ChannelBinding["workspaceDefaultChannel"];

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

function responseMode(detail: DetailPayload) {
  if (detail.conversation.assignedTo) return "humano";
  if (!detail.conversation.botEnabled) return "derivada";
  return "bot";
}

function channelLabel(channel?: BoundChannel | null) {
  if (!channel) return "No resuelto";
  return channel.displayPhoneNumber || channel.phoneNumberId || channel.id;
}

function channelBindingMeta(detail: DetailPayload) {
  const binding = detail.channelBinding;
  if (!binding) {
    return {
      tone: "muted",
      label: "Sin trazabilidad de canal",
      helper: "El detalle actual no incluye contexto de canal para esta conversación."
    } as const;
  }

  if (binding.resolutionStatus === "conversation_channel_inactive") {
    return {
      tone: "warning",
      label: "Canal de conversación inactivo",
      helper: "La conversación sigue ligada a un canal inactivo. El workspace tiene otro canal por defecto operativo."
    } as const;
  }

  if (binding.resolutionStatus === "conversation_channel_missing") {
    return {
      tone: "warning",
      label: "Canal de conversación no encontrado",
      helper: "La conversación quedó sin un canal válido asociado y conviene revisarla antes de operar."
    } as const;
  }

  if (binding.resolutionStatus === "different_from_workspace_default") {
    return {
      tone: "muted",
      label: "Canal distinto al por defecto",
      helper: "La conversación mantiene su canal propio aunque el workspace tenga otro canal configurado por defecto."
    } as const;
  }

  if (binding.resolutionStatus === "matches_workspace_default") {
    return {
      tone: "success",
      label: "Canal alineado",
      helper: "La conversación está ligada al mismo canal que el workspace usa como predeterminado."
    } as const;
  }

  return {
    tone: "muted",
    label: "Canal por defecto no resuelto",
    helper: "El workspace todavía no tiene un canal por defecto explícito o hay más de un canal activo."
  } as const;
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
  onRepairChannel: (channelId?: string) => void;
  repairChannelBusy: boolean;
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
  onRepairChannel,
  repairChannelBusy
}: ChatPanelProps) {
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

  const bindingMeta = detail ? channelBindingMeta(detail) : null;
  const binding = detail?.channelBinding || null;
  const canRepairChannel =
    !readOnly &&
    Boolean(
      binding &&
        (binding.resolutionStatus === "conversation_channel_inactive" ||
          binding.resolutionStatus === "conversation_channel_missing")
    );
  const repairCandidates = (binding?.activeWorkspaceChannels || []).filter(
    (channel) => channel.id !== binding?.conversationChannelId
  );
  const primaryRepairChannel = binding?.workspaceDefaultChannel || repairCandidates[0] || null;
  const bindingToneClass =
    bindingMeta?.tone === "warning"
      ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
      : bindingMeta?.tone === "success"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
        : "border-[color:var(--border)] bg-card/60 text-muted";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
      <header className="sticky top-0 z-10 border-b border-[color:var(--border)] bg-surface/92 p-4 backdrop-blur">
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-semibold">{detail.contact?.name || "Conversacion"}</h2>
                  <InboxBadge className="capitalize">{statusLabel(detail)}</InboxBadge>
                </div>
                <p className="mt-1 text-sm text-muted">{detail.contact?.phone || detail.contact?.email || "Sin dato de contacto"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <InboxBadge>
                  {responseMode(detail) === "bot" ? <Bot className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
                  {responseMode(detail)}
                </InboxBadge>
                <InboxBadge>{stageLabel(detail.deal?.stage)}</InboxBadge>
                {detail.conversation.priority === "hot" ? <InboxBadge className="text-brandBright">prospecto caliente</InboxBadge> : null}
                {readOnly ? <InboxBadge active>Demo</InboxBadge> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onToggleBot}
                disabled={readOnly}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                {detail.conversation.botEnabled ? "Pausar bot" : "Reactivar bot"}
              </button>
              <button
                type="button"
                onClick={onTakeConversation}
                disabled={readOnly}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
              >
                <Hand className="h-3.5 w-3.5" />
                Tomar conversacion
              </button>
              <button
                type="button"
                onClick={onArchive}
                disabled={readOnly}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text disabled:opacity-40"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Archivar
              </button>
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${bindingToneClass}`}>
              <div className="flex flex-wrap items-center gap-2">
                <InboxBadge className="capitalize">{bindingMeta?.label || "Canal"}</InboxBadge>
              </div>
              <p className="mt-2 leading-6">{bindingMeta?.helper}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-current/70">Canal de la conversación</p>
                  <p className="mt-2 font-medium text-current">
                    {channelLabel(detail.channelBinding?.conversationChannel)}
                  </p>
                  <p className="mt-1 text-xs text-current/75">
                    {detail.channelBinding?.conversationChannel?.verifiedName || detail.channelBinding?.conversationChannel?.wabaId || "Sin metadatos"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-current/70">Canal por defecto del workspace</p>
                  <p className="mt-2 font-medium text-current">
                    {channelLabel(detail.channelBinding?.workspaceDefaultChannel)}
                  </p>
                  <p className="mt-1 text-xs text-current/75">
                    {detail.channelBinding?.workspaceDefaultChannel?.verifiedName || detail.channelBinding?.workspaceDefaultChannel?.wabaId || "Sin selección explícita"}
                  </p>
                </div>
              </div>
              {canRepairChannel ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {primaryRepairChannel ? (
                    <button
                      type="button"
                      onClick={() => onRepairChannel(primaryRepairChannel.id)}
                      disabled={repairChannelBusy}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3 py-1.5 text-xs text-current hover:opacity-90 disabled:opacity-50"
                    >
                      {repairChannelBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                      {binding?.workspaceDefaultChannel?.id === primaryRepairChannel.id
                        ? "Reparar con canal por defecto"
                        : "Reparar con canal activo"}
                    </button>
                  ) : null}
                  {repairCandidates
                    .filter((channel) => !primaryRepairChannel || channel.id !== primaryRepairChannel.id)
                    .slice(0, 2)
                    .map((channel) => (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => onRepairChannel(channel.id)}
                        disabled={repairChannelBusy}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/10 px-3 py-1.5 text-xs text-current/90 hover:opacity-90 disabled:opacity-50"
                      >
                        {repairChannelBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                        Usar {channel.displayPhoneNumber || channel.phoneNumberId || "canal"}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold">Inbox cliente</h2>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(176,80,0,0.07),transparent_24%)] p-4">
        {loading ? (
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
            <p className="mt-1 max-w-sm text-xs leading-6 text-muted">Abre una fila de la izquierda para ver el hilo, responder y gestionar el contacto.</p>
          </div>
        ) : null}

        {!loading && detail ? (
          <div className="space-y-3">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-card/60 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <Sparkles className="h-3.5 w-3.5 text-brandBright" />
                <span>Acciones rapidas disponibles para responder, pausar el bot o derivar la conversacion.</span>
              </div>
            </div>
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

function MessageSquareEmpty() {
  return (
    <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-[color:var(--border)] bg-surface/70">
      <Sparkles className="h-5 w-5 text-brandBright" />
    </div>
  );
}
