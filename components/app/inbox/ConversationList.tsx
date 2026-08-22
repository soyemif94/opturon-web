import { MessageSquareText, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  active = true,
  headerAction,
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
  active?: boolean;
  headerAction?: ReactNode;
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
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
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

  useEffect(() => {
    if (!active) return;
    const frame = window.requestAnimationFrame(() => {
      if (scrollViewportRef.current) scrollViewportRef.current.scrollTop = lastScrollTopRef.current;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active]);
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <header className="shrink-0 border-b border-[color:var(--border)] bg-surface/55 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold">Conversaciones</h1>
            <p className="mt-0.5 text-[10px] text-muted">{visibleRows.length} visibles{selectedIds.length ? ` · ${selectedIds.length} seleccionadas` : ""}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {readOnly ? <InboxBadge active>Demo</InboxBadge> : null}
            {headerAction}
          </div>
        </div>

        <label className="mt-2.5 flex h-9 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-bg/55 px-3 focus-within:border-brand/40">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre, telefono o mensaje"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted"
            aria-label="Buscar conversaciones"
          />
        </label>

        <div className="mt-2 flex items-center gap-1.5" aria-label="Filtros de conversaciones">
          <button
            type="button"
            onClick={() => onChannelChange("whatsapp")}
            className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-medium transition ${
              channel === "whatsapp" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-[color:var(--border)] text-muted hover:text-text"
            }`}
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => onChannelChange("instagram")}
            className={`inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-medium transition ${
              channel === "instagram" ? "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-100" : "border-[color:var(--border)] text-muted hover:text-text"
            }`}
          >
            Instagram
          </button>
          <select
            value={visibility}
            onChange={(event) => onVisibilityChange(event.target.value as "active" | "archived")}
            className="h-7 min-w-0 rounded-full border border-[color:var(--border)] bg-transparent px-2 text-[10px] text-muted outline-none"
            aria-label="Visibilidad"
          >
            <option value="active">Activas</option>
            <option value="archived">Archivadas</option>
          </select>
          <button
            type="button"
            onClick={() => setFiltersExpanded((current) => !current)}
            className={`ml-auto inline-flex size-7 items-center justify-center rounded-full border transition ${filter !== "all" ? "border-brand/40 bg-brand/10 text-text" : "border-[color:var(--border)] text-muted hover:text-text"}`}
            aria-label="Abrir filtros"
            aria-expanded={filtersExpanded}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        {filtersExpanded ? (
          <div className="mt-2 border-t border-[color:var(--border)] pt-2">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((item) => (
                <button key={item.key} type="button" onClick={() => onFilterChange(item.key)}>
                  <InboxBadge active={filter === item.key}>{item.label}</InboxBadge>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {(filter !== "all" || search.trim()) ? (
          <div className="mt-2 flex items-center justify-between border-t border-[color:var(--border)] pt-2 text-[10px] text-muted">
            <span>{search.trim() ? `Búsqueda: ${search.trim()}` : `Filtro: ${FILTERS.find((item) => item.key === filter)?.label}`}</span>
            <button type="button" onClick={onClearFilters} className="font-medium text-text hover:underline">Limpiar filtros</button>
          </div>
        ) : null}

        {selectedIds.length > 0 || showingArchived ? (
          <div className="mt-2 border-t border-[color:var(--border)] pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted">
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
                  className="rounded-full border border-[color:var(--border)] px-2.5 py-1 text-[10px] text-muted hover:text-text"
                  disabled={!visibleIds.length}
                >
                  {allVisibleSelected ? "Limpiar visibles" : "Seleccionar visibles"}
                </button>
                <button
                  type="button"
                  onClick={showingArchived ? onRestoreSelected : onArchiveSelected}
                  className={`rounded-full border px-2.5 py-1 text-[10px] disabled:opacity-40 ${
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

      <div
        ref={scrollViewportRef}
        onScroll={(event) => {
          if (active) lastScrollTopRef.current = event.currentTarget.scrollTop;
        }}
        className="app-scroll-surface relative min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch]"
        tabIndex={0}
        aria-label="Lista de conversaciones"
      >
        {loading && !hasLoaded ? <ConversationListSkeleton /> : null}
        {loading && hasLoaded ? (
          <div className="sticky top-0 z-10 mb-1 flex justify-end" role="status">
            <span className="rounded-full border border-[color:var(--border)] bg-background/95 px-2.5 py-1 text-[10px] text-muted shadow">Actualizando…</span>
          </div>
        ) : null}

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

        {hasSearchResults ? (
          <div className="space-y-0.5">
            {visibleRows.map((row) => (
              <ConversationRow
                key={row.id}
                row={row}
                selected={selectedId === row.id}
                bulkSelected={selectedIds.includes(row.id)}
                onSelectStart={() => {
                  if (scrollViewportRef.current) lastScrollTopRef.current = scrollViewportRef.current.scrollTop;
                }}
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
