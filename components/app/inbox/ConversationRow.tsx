import { InboxBadge } from "@/components/app/inbox/Badge";
import { getConversationPriority } from "@/components/app/inbox/conversation-priority";
import { SimpleAvatar } from "@/components/app/simple-avatar";
import type { ConversationRowData } from "@/components/app/inbox/types";
import { cn } from "@/lib/cn";

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
  const displayName = row.contact?.name?.trim() || row.contact?.phone || "Sin nombre";
  const metaLine = row.contact?.name?.trim() ? row.contact?.phone || row.contact?.email || "Sin contacto" : "Sin nombre guardado";

  const priorityAccent =
    derivedPriority === "high"
      ? "before:bg-red-400"
      : derivedPriority === "medium"
        ? "before:bg-amber-300"
        : "before:bg-slate-500";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 transition-all duration-200 before:absolute before:left-0 before:top-0 before:h-full before:w-1.5 before:content-[''] hover:border-brand/20 hover:bg-card/90",
        priorityAccent,
        selected ? "border-brand/40 bg-brand/8 ring-1 ring-brand/30 shadow-[0_20px_60px_rgba(0,0,0,0.24)]" : "",
        hasUnread && !selected ? "border-brand/20 bg-brand/5" : ""
      )}
    >
      <div className="flex items-start gap-3">
        {onToggleSelect ? (
          <label className="mt-1 inline-flex items-center">
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

        <button onClick={onSelect} className="w-full text-left" type="button">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <SimpleAvatar
                src={row.contact?.profileImageUrl}
                name={displayName}
                className="h-12 w-12 rounded-full border border-white/10 bg-brand/10 text-sm text-brandBright shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                fallbackClassName="bg-brand/10 text-brandBright"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="line-clamp-1 text-sm font-semibold">{displayName}</p>
                  {hasUnread ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">
                      {row.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted">{metaLine}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("text-xs", hasUnread ? "font-semibold text-text" : "text-muted")}>{formatAgo(row.lastMessageAt)}</p>
              <p className="mt-1 text-[11px] text-muted">{ownerLabel}</p>
            </div>
          </div>

          <p className={cn("mt-3 line-clamp-2 text-sm leading-5", hasUnread ? "text-text" : "text-muted")}>{preview}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <InboxBadge className={response.className}>{response.label}</InboxBadge>
            <InboxBadge className={leadStatus.className}>{leadStatus.label}</InboxBadge>
            {row.priority === "hot" ? <InboxBadge className="text-brandBright">Caliente</InboxBadge> : null}
            {row.deal?.stage === "won" ? <InboxBadge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100">Ganado</InboxBadge> : null}
            {followUp ? <InboxBadge className={followUp.className}>{followUp.label}</InboxBadge> : null}
            {row.transferPaymentStatus === "payment_pending_validation" ? <InboxBadge>Pago pendiente</InboxBadge> : null}
          </div>
        </button>
      </div>

      <div className="pointer-events-none mt-3 flex gap-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <button
          type="button"
          onClick={onMarkHot}
          disabled={disabled}
          className="rounded-full border border-[color:var(--border)] px-2.5 py-1 text-xs text-muted hover:text-text disabled:opacity-40"
        >
          Marcar caliente
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="rounded-full border border-[color:var(--border)] px-2.5 py-1 text-xs text-muted hover:text-text disabled:opacity-40"
        >
          Archivar
        </button>
      </div>
    </div>
  );
}
