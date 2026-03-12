import { MessageSquareText, Search, SlidersHorizontal } from "lucide-react";
import { ConversationRow } from "@/components/app/inbox/ConversationRow";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { ConversationListSkeleton } from "@/components/app/inbox/Skeleton";
import type { ConversationRowData, FilterKey } from "@/components/app/inbox/types";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "hot", label: "Prospecto caliente" },
  { key: "sin_responder", label: "Esperando respuesta" },
  { key: "nuevas", label: "Nuevas" },
  { key: "asignadas", label: "Asignadas" }
];

export function ConversationList({
  rows,
  loading,
  hasLoaded,
  errorMessage,
  selectedId,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelect,
  onMarkHot,
  onClose,
  readOnly,
  onClearFilters,
  onRetry
}: {
  rows: ConversationRowData[];
  loading: boolean;
  hasLoaded: boolean;
  errorMessage?: string | null;
  selectedId?: string;
  filter: FilterKey;
  search: string;
  onFilterChange: (value: FilterKey) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onMarkHot: (id: string) => void;
  onClose: (id: string) => void;
  readOnly: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
}) {
  const unread = rows.reduce((acc, row) => acc + row.unreadCount, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
      <header className="border-b border-[color:var(--border)] bg-surface/85 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Inbox</p>
            <h2 className="mt-1 text-lg font-semibold">Conversaciones</h2>
            <p className="mt-1 text-xs text-muted">WhatsApp en tiempo real, ordenado por ultima actividad y prioridad.</p>
          </div>
          <InboxBadge active={readOnly}>Demo</InboxBadge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[color:var(--border)] bg-card/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Activas</p>
            <p className="mt-2 text-xl font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-card/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">No leidas</p>
            <p className="mt-2 text-xl font-semibold">{unread}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-bg/70 px-3 py-2.5">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por contacto, telefono o email"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button key={item.key} type="button" onClick={() => onFilterChange(item.key)}>
                <InboxBadge active={filter === item.key}>{item.label}</InboxBadge>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? <ConversationListSkeleton /> : null}

        {!loading && errorMessage ? (
          <div className="rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-xs text-red-100">
            <p className="font-medium">No se pudo cargar el inbox.</p>
            <p className="mt-1 opacity-80">{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-full border border-red-300/30 px-3 py-1.5 text-[11px] hover:text-white"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading && hasLoaded && !errorMessage && rows.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-card/40 px-5 text-center">
            <MessageSquareText className="h-8 w-8 text-muted" />
            <p className="mt-3 text-base font-semibold">Todavia no hay conversaciones visibles</p>
            <p className="mt-1 text-xs leading-6 text-muted">
              Cuando entren mensajes por WhatsApp o limpies los filtros actuales, las conversaciones van a aparecer aqui para gestionarlas desde el portal.
            </p>
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text"
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}

        {!loading
          ? rows.map((row) => (
              <ConversationRow
                key={row.id}
                row={row}
                selected={selectedId === row.id}
                onSelect={() => onSelect(row.id)}
                onMarkHot={() => onMarkHot(row.id)}
                onClose={() => onClose(row.id)}
                disabled={readOnly}
              />
            ))
          : null}
      </div>
    </div>
  );
}
