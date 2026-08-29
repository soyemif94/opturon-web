import { getConversationPriority } from "@/components/app/inbox/conversation-priority";
import { SimpleAvatar } from "@/components/app/simple-avatar";
import type { ConversationRowData } from "@/components/app/inbox/types";
import { cn } from "@/lib/cn";
import { Archive, Flame, MoreHorizontal, Pause } from "lucide-react";

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

export function ConversationRow({
  row,
  selected,
  bulkSelected,
  onSelectStart,
  onSelect,
  onToggleSelect,
  onMarkHot,
  onClose,
  disabled
}: {
  row: ConversationRowData;
  selected: boolean;
  bulkSelected?: boolean;
  onSelectStart?: () => void;
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
  const followUp = followUpUi(row.nextActionAt);
  const channelLabel = row.channelType === "instagram" ? "Instagram" : "WhatsApp";
  const displayName =
    row.contact?.displayName?.trim() ||
    row.contact?.name?.trim() ||
    row.contact?.phone ||
    "Sin nombre";
  const subline = row.contact?.username ? `${row.contact.username} · ${preview}` : preview;
  const priorityTone = derivedPriority === "high" ? "bg-red-400" : derivedPriority === "medium" ? "bg-amber-300" : "bg-slate-500";
  const rowSummary = [
    channelLabel,
    ownerLabel,
    row.leadStatusLabel || row.leadStatus,
    row.botEnabled ? "Bot activo" : "Bot pausado",
    row.importedHistory ? "Historial importado" : null,
    row.deal?.stage === "won" ? "Venta ganada" : null,
    row.transferPaymentStatus === "payment_pending_validation" ? "Pago pendiente" : null
  ].filter(Boolean).join(" · ");

  return (
    <article
      title={rowSummary}
      className={cn(
        "group relative flex min-h-[4.5rem] items-center border-b border-[color:var(--border)] transition-colors",
        selected ? "bg-brand/10 shadow-[inset_3px_0_0_var(--brand)]" : "hover:bg-muted/20",
        hasUnread && !selected ? "bg-brand/[0.045]" : ""
      )}
    >
      {onToggleSelect ? (
          <label className={cn("ml-2 inline-flex items-center transition-opacity", bulkSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100")}>
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

      <button onPointerDown={onSelectStart} onClick={onSelect} className="min-w-0 flex-1 px-3 py-2.5 text-left" type="button" aria-current={selected ? "true" : undefined}>
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <SimpleAvatar
                src={row.contact?.profileImageUrl}
                name={displayName}
                className="size-10 rounded-full border border-white/10 bg-brand/10 text-xs text-brandBright"
                fallbackClassName="bg-brand/10 text-brandBright"
              />
              <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background", row.channelType === "instagram" ? "bg-fuchsia-400" : "bg-emerald-400")} aria-label={channelLabel} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("truncate text-sm", hasUnread ? "font-semibold text-text" : "font-medium")}>{displayName}</p>
                <p className={cn("shrink-0 text-[10px] tabular-nums", hasUnread ? "font-medium text-text" : "text-muted")}>{formatAgo(row.lastMessageAt)}</p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className={cn("min-w-0 flex-1 truncate text-xs", hasUnread ? "font-medium text-text" : "text-muted")}>{subline}</p>
                {hasUnread ? <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white" aria-label={`${row.unreadCount} mensajes sin leer`}>{row.unreadCount}</span> : null}
              </div>
              {(followUp || !row.botEnabled || row.priority === "hot") ? (
                <div className="mt-1 flex items-center gap-2 text-[9px] text-muted">
                  {followUp ? <span className={followUp.className.includes("red") ? "text-red-200" : "text-amber-100"}>{followUp.label}</span> : null}
                  {!row.botEnabled ? <span className="inline-flex items-center gap-1 text-amber-100"><Pause aria-hidden="true" className="size-2.5" />Bot pausado</span> : null}
                  {row.priority === "hot" ? <span className="inline-flex items-center gap-1 text-red-200"><span className={cn("size-1.5 rounded-full", priorityTone)} />Prioridad</span> : null}
                </div>
              ) : null}
            </div>
          </div>
      </button>

        <details className="relative mr-2 shrink-0">
          <summary className="inline-flex size-7 cursor-pointer list-none items-center justify-center rounded-full text-muted opacity-0 transition hover:bg-muted/40 hover:text-text group-hover:opacity-100 focus-visible:opacity-100" aria-label={`Más acciones para ${displayName}`}>
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </summary>
          <div className="absolute right-0 top-8 z-20 w-40 rounded-xl border border-[color:var(--border)] bg-card p-1.5 shadow-xl">
            <button type="button" onClick={onMarkHot} disabled={disabled} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-muted/40 hover:text-text disabled:opacity-40"><Flame aria-hidden="true" className="size-3.5" />Marcar caliente</button>
            <button type="button" onClick={onClose} disabled={disabled} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-muted/40 hover:text-text disabled:opacity-40"><Archive aria-hidden="true" className="size-3.5" />Archivar</button>
          </div>
        </details>
    </article>
  );
}
