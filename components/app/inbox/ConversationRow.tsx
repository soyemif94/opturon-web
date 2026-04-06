import { InboxBadge } from "@/components/app/inbox/Badge";
import { getConversationPriority } from "@/components/app/inbox/conversation-priority";
import { cn } from "@/lib/cn";
import type { ConversationRowData } from "@/components/app/inbox/types";

function formatAgo(iso: string) {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return "";
  const diff = Math.max(0, Date.now() - date);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function slaTone(slaMinutes: number) {
  if (slaMinutes > 120) return "text-red-300";
  if (slaMinutes > 30) return "text-yellow-300";
  return "text-green-300";
}

function statusLabel(status: ConversationRowData["status"], unreadCount: number) {
  if (status === "new") return "Nueva";
  if (status === "closed") return "Resuelta";
  if (unreadCount > 0) return "Esperando respuesta";
  return "Activa";
}

export function ConversationRow({
  row,
  selected,
  onSelect,
  onMarkHot,
  onClose,
  disabled
}: {
  row: ConversationRowData;
  selected: boolean;
  onSelect: () => void;
  onMarkHot: () => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  const contact = row.contact?.name || "Sin nombre";
  const meta = row.contact?.phone || row.contact?.email || "Sin contacto";
  const preview = row.lastMessagePreview?.trim() || "Sin mensajes recientes";
  const hasUnread = row.unreadCount > 0;
  const derivedPriority = getConversationPriority(row);
  const priorityUi =
    derivedPriority === "high"
      ? {
          label: "Alta",
          dotClassName: "bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.18)]",
          rowClassName: "border-red-400/35 bg-red-400/[0.08] hover:bg-red-400/[0.12]"
        }
      : derivedPriority === "medium"
        ? {
            label: "Reciente",
            dotClassName: "bg-amber-300 shadow-[0_0_0_4px_rgba(252,211,77,0.12)]",
            rowClassName: "border-amber-300/20 bg-amber-300/[0.04] hover:bg-amber-300/[0.08]"
          }
        : {
            label: "Normal",
            dotClassName: "bg-slate-400",
            rowClassName: "border-[color:var(--border)] hover:bg-muted/50"
          };

  return (
    <div
      className={cn(
        "group rounded-2xl border p-3 transition-colors",
        selected ? "border-brand/40 bg-muted/10 ring-1 ring-brand/30" : priorityUi.rowClassName,
        hasUnread && !selected ? "bg-brand/5" : ""
      )}
    >
      <button onClick={onSelect} className="w-full text-left" type="button">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="line-clamp-1 text-sm font-semibold">{contact}</p>
              <InboxBadge className="text-[11px]">WhatsApp</InboxBadge>
              <InboxBadge className="text-[11px]">{statusLabel(row.status, row.unreadCount)}</InboxBadge>
              {row.priority === "hot" ? <InboxBadge className="text-[11px]">Prioritaria</InboxBadge> : null}
              {row.transferPaymentStatus === "payment_pending_validation" ? (
                <InboxBadge className="text-[11px]">Pago pendiente</InboxBadge>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted">{meta}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="inline-flex items-center justify-end gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">
              <span className={cn("inline-flex h-2.5 w-2.5 rounded-full", priorityUi.dotClassName)} />
              <span>{priorityUi.label}</span>
            </div>
            <p className={cn("text-xs", hasUnread ? "font-semibold text-text" : "text-muted")}>{formatAgo(row.lastMessageAt)}</p>
            {hasUnread ? (
              <span className="mt-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-2 text-[11px] font-semibold text-white">
                {row.unreadCount}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <p className={cn("line-clamp-2 min-w-0 text-xs leading-5", hasUnread ? "text-text" : "text-muted")}>{preview}</p>
          <span className={cn("text-xs", slaTone(row.slaMinutes))}>SLA {row.slaMinutes}m</span>
        </div>
      </button>

      <div className="mt-2 flex gap-2 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
        <button
          type="button"
          onClick={onMarkHot}
          disabled={disabled}
          className="rounded-full border border-[color:var(--border)] px-2.5 py-1 text-xs text-muted hover:text-text disabled:opacity-40"
        >
          Marcar prioridad
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className="rounded-full border border-[color:var(--border)] px-2.5 py-1 text-xs text-muted hover:text-text disabled:opacity-40"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
