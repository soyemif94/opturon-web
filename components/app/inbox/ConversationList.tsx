import { ChevronDown, ChevronUp, MessageSquareText, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { ConversationRow } from "@/components/app/inbox/ConversationRow";
import { sortConversationsByPriority } from "@/components/app/inbox/conversation-priority";
import { ConversationListSkeleton } from "@/components/app/inbox/Skeleton";
import type { ConversationRowData, FilterKey, InboxChannelKey } from "@/components/app/inbox/types";
import { normalizeText } from "@/lib/search/normalize";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "new", label: "Nuevos" },
  { key: "in_conversation", label: "En conversacion" },
  { key: "follow_up", label: "Seguimiento" },
  { key: "closed", label: "Cerrados" },
  { key: "with_follow_up", label: "Con seguimiento" },
  { key: "overdue", label: "Vencidos" },
  { key: "today", label: "Hoy" },
  { key: "unassigned", label: "Sin asignar" }
];

export function ConversationList({
  rows,
  loading,
  hasLoaded,
  errorMessage,
  selectedId,
  filter,
  channel,
  search,
  onFilterChange,
  onChannelChange,
  onSearchChange,
  onSelect,
  onMarkHot,
  onClose,
  readOnly,
  onClearFilters,
  onRetry,
  visibility,
  onVisibilityChange,
  selectedIds,
  onToggleSelect,
  onSelectVisible,
  onClearSelection,
  onArchiveSelected,
  archiveBusy,
  onRestoreSelected,
  restoreBusy
}: {
  rows: ConversationRowData[];
  loading: boolean;
  hasLoaded: boolean;
  errorMessage?: string | null;
  selectedId?: string;
  filter: FilterKey;
  channel: InboxChannelKey;
  search: string;
  onFilterChange: (value: FilterKey) => void;
  onChannelChange: (value: InboxChannelKey) => void;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onMarkHot: (id: string) => void;
  onClose: (id: string) => void;
  readOnly: boolean;
  onClearFilters: () => void;
  onRetry: () => void;
  visibility: "active" | "archived";
  onVisibilityChange: (value: "active" | "archived") => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectVisible: (ids: string[]) => void;
  onClearSelection: () => void;
  onArchiveSelected: () => void;
  archiveBusy?: boolean;
  onRestoreSelected: () => void;
  restoreBusy?: boolean;
}) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const normalizedQuery = useMemo(() => normalizeText(search).join(" "), [search]);

  const visibleRows = useMemo(() => {
    const filtered = !normalizedQuery ? rows : rows.filter((row) => buildSearchHaystack(row).includes(normalizedQuery));
    return sortConversationsByPriority(filtered);
  }, [normalizedQuery, rows]);

  const hasSearchResults = visibleRows.length > 0;
  const isSearching = search.trim().length > 0;
  const visibleIds = useMemo(() => visibleRows.map((row) => row.id), [visibleRows]);
  const selectedVisibleCount = useMemo(() => visibleIds.filter((id) => selectedIds.includes(id)).length, [selectedIds, visibleIds]);
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const showingArchived = visibility === "archived";
  const emptyTitle =
    channel === "instagram"
      ? "Todavia no hay conversaciones de Instagram"
      : showingArchived
        ? "Todavia no hay conversaciones archivadas"
        : "Todavia no hay conversaciones visibles";
  const emptyCopy =
    channel === "instagram"
      ? "Cuando conectes Instagram y recibas mensajes, van a aparecer aca."
      : showingArchived
        ? "Cuando archives conversaciones desde la vista activa, apareceran aca."
        : "Cuando entren mensajes o limpies filtros, las conversaciones apareceran aca para operarlas.";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
      <header className="shrink-0 border-b border-[color:var(--border)] bg-surface/90 p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Inbox</p>
            <h2 className="mt-1 text-xl font-semibold">Conversaciones</h2>
            <p className="mt-1 text-xs text-muted">Elegí rápido un hilo, revisá estado y entrá a actuar sin ruido extra.</p>
          </div>
          {readOnly ? <InboxBadge active>Demo</InboxBadge> : null}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-[20px] border border-[color:var(--border)] bg-bg/70 px-3 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre, telefono o mensaje"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-[18px] border border-[color:var(--border)] bg-bg/55 p-1">
          <button
            type="button"
            onClick={() => onChannelChange("whatsapp")}
            className={`rounded-[14px] px-3 py-2 text-xs font-medium transition ${
              channel === "whatsapp" ? "bg-card text-text shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => onChannelChange("instagram")}
            className={`rounded-[14px] px-3 py-2 text-xs font-medium transition ${
              channel === "instagram" ? "bg-card text-text shadow-sm" : "text-muted hover:text-text"
            }`}
          >
            Instagram
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onVisibilityChange("active")}>
            <InboxBadge active={!showingArchived}>Activas</InboxBadge>
          </button>
          <button type="button" onClick={() => onVisibilityChange("archived")}>
            <InboxBadge active={showingArchived}>Archivadas</InboxBadge>
          </button>
        </div>

        <div className="mt-4 rounded-[22px] border border-[color:var(--border)] bg-card/45">
          <button
            type="button"
            onClick={() => setFiltersExpanded((current) => !current)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
            </div>
            <span className="inline-flex items-center gap-2 text-xs text-muted">
              {FILTERS.find((item) => item.key === filter)?.label || "Todas"}
              {filtersExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          </button>
          {filtersExpanded ? (
            <div className="border-t border-[color:var(--border)] px-4 pb-4 pt-3">
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button key={item.key} type="button" onClick={() => onFilterChange(item.key)}>
                    <InboxBadge active={filter === item.key}>{item.label}</InboxBadge>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {selectedIds.length > 0 || showingArchived ? (
          <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-card/55 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {selectedIds.length > 0
                  ? `${selectedIds.length} conversaciones seleccionadas`
                  : showingArchived
                    ? "Selecciona conversaciones archivadas para restaurarlas."
                    : "Selecciona conversaciones para ocultarlas del inbox."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => (allVisibleSelected ? onClearSelection() : onSelectVisible(visibleIds))}
                  className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted hover:text-text"
                  disabled={!visibleIds.length}
                >
                  {allVisibleSelected ? "Limpiar visibles" : "Seleccionar visibles"}
                </button>
                <button
                  type="button"
                  onClick={showingArchived ? onRestoreSelected : onArchiveSelected}
                  className={`rounded-full border px-3 py-1.5 text-xs disabled:opacity-40 ${
                    showingArchived
                      ? "border-emerald-400/30 text-emerald-100 hover:text-white"
                      : "border-red-400/30 text-red-100 hover:text-white"
                  }`}
                  disabled={readOnly || selectedIds.length === 0 || archiveBusy || restoreBusy}
                >
                  {showingArchived ? (restoreBusy ? "Restaurando..." : "Restaurar") : archiveBusy ? "Ocultando..." : "Archivar"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
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

        {!loading && hasLoaded && !errorMessage && !hasSearchResults ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-card/40 px-5 text-center">
            <MessageSquareText className="h-8 w-8 text-muted" />
            <p className="mt-3 text-base font-semibold">
              {isSearching
                ? "No encontramos conversaciones para esa busqueda"
                : emptyTitle}
            </p>
            <p className="mt-1 text-xs leading-6 text-muted">
              {isSearching
                ? "Proba con otro nombre, telefono o limpia la busqueda."
                : emptyCopy}
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

        {!loading && hasSearchResults ? (
          <div className="space-y-3">
            {visibleRows.map((row) => (
              <ConversationRow
                key={row.id}
                row={row}
                selected={selectedId === row.id}
                bulkSelected={selectedIds.includes(row.id)}
                onSelect={() => onSelect(row.id)}
                onToggleSelect={() => onToggleSelect(row.id)}
                onMarkHot={() => onMarkHot(row.id)}
                onClose={() => onClose(row.id)}
                disabled={readOnly}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildSearchHaystack(row: ConversationRowData) {
  const values = [row.contact?.name, row.contact?.phone, row.contact?.email, row.contact?.id, row.lastMessagePreview, row.transferPaymentOrderId]
    .filter(Boolean)
    .join(" ");

  return normalizeText(values).join(" ");
}
