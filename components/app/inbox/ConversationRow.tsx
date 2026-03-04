import { InboxBadge } from "@/components/app/inbox/Badge";
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

  return (
    <div
      className={cn(
        "group rounded-2xl border p-3 transition-colors",
        selected ? "border-brand/40 bg-muted/10 ring-1 ring-brand/30" : "border-[color:var(--border)] hover:bg-muted/50"
      )}
    >
      <button onClick={onSelect} className="w-full text-left" type="button">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="line-clamp-1 text-sm font-semibold">{contact}</p>
            <p className="mt-0.5 text-xs text-muted">{meta}</p>
          </div>
          <p className="text-xs text-muted">{formatAgo(row.lastMessageAt)}</p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {row.priority === "hot" ? <InboxBadge className="text-[11px]">?? Hot</InboxBadge> : null}
            {row.status === "new" ? <InboxBadge className="text-[11px]">? Nueva</InboxBadge> : null}
            {row.unreadCount > 0 ? <InboxBadge className="text-[11px]">?? {row.unreadCount}</InboxBadge> : null}
          </div>
          <span className={cn("text-xs", slaTone(row.slaMinutes))}>SLA {row.slaMinutes}m</span>
        </div>
      </button>

      <div className="mt-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onMarkHot}
          disabled={disabled}
          className="rounded-full border border-[color:var(--border)] px-2.5 py-1 text-xs text-muted hover:text-text disabled:opacity-40"
        >
          Marcar hot
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
