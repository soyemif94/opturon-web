import { ConversationRow } from "@/components/app/inbox/ConversationRow";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { ConversationListSkeleton } from "@/components/app/inbox/Skeleton";
import type { ConversationRowData, FilterKey } from "@/components/app/inbox/types";

const FILTERS: Array<{ key: FilterKey; label: string; emoji: string }> = [
  { key: "all", label: "Todas", emoji: "??" },
  { key: "hot", label: "Hot", emoji: "??" },
  { key: "sin_responder", label: "Sin responder", emoji: "??" },
  { key: "nuevas", label: "Nuevas", emoji: "?" },
  { key: "asignadas", label: "Asignadas", emoji: "??" }
];

export function ConversationList({
  rows,
  loading,
  selectedId,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelect,
  onMarkHot,
  onClose,
  readOnly,
  onClearFilters
}: {
  rows: ConversationRowData[];
  loading: boolean;
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
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[color:var(--border)] bg-card p-4 shadow-sm">
      <header className="mb-3">
        <h2 className="text-base font-semibold">Conversaciones</h2>
        <p className="text-xs text-muted">Buscador, filtros y acciones rápidas.</p>
      </header>

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button key={item.key} type="button" onClick={() => onFilterChange(item.key)}>
            <InboxBadge active={filter === item.key}>
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </InboxBadge>
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar por contacto, email o teléfono"
        className="mb-3 w-full rounded-2xl border border-[color:var(--border)] bg-bg px-3 py-2 text-sm outline-none focus:border-brand/40"
      />

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {loading ? <ConversationListSkeleton /> : null}

        {!loading && rows.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] px-4 text-center">
            <p className="text-2xl">??</p>
            <p className="mt-2 text-base font-semibold">Sin conversaciones</p>
            <p className="mt-1 text-xs text-muted">Probá cambiar filtros o búsqueda.</p>
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-3 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text"
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
