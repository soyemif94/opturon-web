import { InboxBadge } from "@/components/app/inbox/Badge";
import { getConversationPriority } from "@/components/app/inbox/conversation-priority";
import { SimpleAvatar } from "@/components/app/simple-avatar";
import type { ConversationRowData } from "@/components/app/inbox/types";
import { cn } from "@/lib/cn";
import { Archive, Flame, MoreHorizontal } from "lucide-react";

function formatAgo(iso: string) {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return "";
  const diff = Math.max(0, Date.now() - date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} dia${days === 1 ? "" : "s"}`;
}

function leadStatusUi(leadStatus: ConversationRowData["leadStatus"]) {
  if (leadStatus === "IN_CONVERSATION") return { label: "En conversacion", className: "border-sky-400/30 bg-sky-400/10 text-sky-100" };
  if (leadStatus === "FOLLOW_UP") return { label: "Seguimiento", className: "border-amber-400/30 bg-amber-400/10 text-amber-100" };
  if (leadStatus === "CLOSED") return { label: "Cerrado", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" };
  return { label: "Nuevo", className: "border-white/10 bg-white/5 text-muted" };
}

function followUpUi(nextActionAt?: string | null) {
  if (!nextActionAt) return null;
  const date = new Date(nextActionAt);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (date.getTime() < now.getTime()) {
    return { label: "Vencido", className: "border-red-400/30 bg-red-400/10 text-red-100" };
  }
  if (isToday) {
    return { label: "Hoy", className: "border-amber-400/30 bg-amber-400/10 text-amber-100" };
  }
  return {
    label: date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
    className: "border-white/10 bg-white/5 text-muted"
  };
}

function responseUi(row: ConversationRowData) {
  if (row.channelType === "instagram") {
    return { label: "Lectura", className: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100" };
  }
  if (!row.botEnabled) {
    return { label: "Bot pausado", className: "border-amber-400/30 bg-amber-400/10 text-amber-100" };
  }
  if (row.unreadCount > 0 || row.status === "new") {
    return { label: "Sin responder", className: "border-red-400/30 bg-red-400/10 text-red-100" };
  }
  return { label: "Respondido", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" };
}

export function ConversationRow({
  row,
  selected,
  bulkSelected,
  onSelect,
  onToggleSelect,
  onMarkHot,
  onClose,
  disabled
}: {
  row: ConversationRowData;
  selected: boolean;
  bulkSelected?: boolean;
  onSelect: () => void;
  onToggleSelect?: () => void;
  onMarkHot: () => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  const preview = row.lastMessagePreview?.trim() || "Sin mensajes recientes";
  const ownerLabel = row.assignedSellerName || row.assignedTo || "Sin owner";
  const hasUnread = row.unreadCount > 0;
  const derivedPriority = getConversationPriority(row);
  const leadStatus = leadStatusUi(row.leadStatus);
  const followUp = followUpUi(row.nextActionAt);
  const response = responseUi(row);
  const channelLabel = row.channelType === "instagram" ? "Instagram" : "WhatsApp";
  const displayName = row.contact?.name?.trim() || row.contact?.phone || "Sin nombre";
  const priorityTone = derivedPriority === "high" ? "bg-red-400" : derivedPriority === "medium" ? "bg-amber-300" : "bg-slate-500";

  return (
    <article
      className={cn(
        "group relative rounded-xl border px-2.5 py-2.5 transition-colors",
        selected ? "border-brand/45 bg-brand/10 ring-1 ring-brand/20" : "border-transparent hover:border-[color:var(--border)] hover:bg-muted/25",
        hasUnread && !selected ? "bg-brand/[0.045]" : ""
      )}
    >
      <div className="flex items-start gap-2">
        {onToggleSelect ? (
          <label className="mt-2 inline-flex items-center">
            <input
              type="checkbox"
              checked={Boolean(bulkSelected)}
              onChange={() => onToggleSelect()}
              disabled={disabled}
              className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--brand)]"
              aria-label={`Seleccionar conversacion ${displayName}`}
            />
          </label>
        ) : null}

        <button onClick={onSelect} className="min-w-0 flex-1 text-left" type="button" aria-current={selected ? "true" : undefined}>
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <SimpleAvatar
                src={row.contact?.profileImageUrl}
                name={displayName}
                className="size-10 rounded-full border border-white/10 bg-brand/10 text-xs text-brandBright"
                fallbackClassName="bg-brand/10 text-brandBright"
              />
              <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background", priorityTone)} aria-label={`Prioridad ${derivedPriority}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("truncate text-sm", hasUnread ? "font-semibold text-text" : "font-medium")}>{displayName}</p>
                <p className={cn("shrink-0 text-[10px] tabular-nums", hasUnread ? "font-medium text-text" : "text-muted")}>{formatAgo(row.lastMessageAt)}</p>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
                <span className={cn("size-1.5 rounded-full", row.channelType === "instagram" ? "bg-fuchsia-400" : "bg-emerald-400")} />
                <span>{channelLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{ownerLabel}</span>
              </div>
            </div>
          </div>

          <p className={cn("mt-2 truncate text-xs", hasUnread ? "font-medium text-text" : "text-muted")}>{preview}</p>

          <div className="mt-2 flex min-w-0 items-center gap-1.5 overflow-hidden">
            <InboxBadge className={response.className}>{response.label}</InboxBadge>
            <InboxBadge className={leadStatus.className}>{leadStatus.label}</InboxBadge>
            {followUp ? <InboxBadge className={followUp.className}>{followUp.label}</InboxBadge> : null}
            {row.importedHistory ? <InboxBadge className="border-emerald-300/25 bg-emerald-300/10 text-emerald-100">Historial</InboxBadge> : null}
            {row.deal?.stage === "won" ? <InboxBadge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100">Ganado</InboxBadge> : null}
            {row.transferPaymentStatus === "payment_pending_validation" ? <InboxBadge>Pago pendiente</InboxBadge> : null}
            {hasUnread ? <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white" aria-label={`${row.unreadCount} mensajes sin leer`}>{row.unreadCount}</span> : null}
          </div>
        </button>

        <details className="relative shrink-0">
          <summary className="inline-flex size-7 cursor-pointer list-none items-center justify-center rounded-full text-muted opacity-60 transition hover:bg-muted/40 hover:text-text group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Más acciones para ${displayName}`}>
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </summary>
          <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-[color:var(--border)] bg-card p-1.5 shadow-xl">
            <button type="button" onClick={onMarkHot} disabled={disabled} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-muted/40 hover:text-text disabled:opacity-40"><Flame aria-hidden="true" className="size-3.5" />Marcar caliente</button>
            <button type="button" onClick={onClose} disabled={disabled} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-muted/40 hover:text-text disabled:opacity-40"><Archive aria-hidden="true" className="size-3.5" />Archivar</button>
          </div>
        </details>
      </div>
    </article>
  );
}
