import { ChevronDown, ChevronUp, MessageSquareText, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { InboxBadge } from "@/components/app/inbox/Badge";
import { ConversationRow } from "@/components/app/inbox/ConversationRow";
import { getConversationPriority, sortConversationsByPriority } from "@/components/app/inbox/conversation-priority";
import { ConversationListSkeleton } from "@/components/app/inbox/Skeleton";
import type { ConversationRowData, FilterKey } from "@/components/app/inbox/types";
import { normalizeText } from "@/lib/search/normalize";

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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    pending: false,
    recent: false,
    all: true
  });

  const normalizedQuery = useMemo(() => normalizeText(search).join(" "), [search]);

  const visibleRows = useMemo(() => {
    if (!normalizedQuery) return rows;
    return rows.filter((row) => buildSearchHaystack(row).includes(normalizedQuery));
  }, [normalizedQuery, rows]);

  const prioritizedRows = useMemo(() => sortConversationsByPriority(visibleRows), [visibleRows]);

  const groupedRows = useMemo(
    () => [
      {
        key: "pending",
        title: "Pagos pendientes",
        description: "Conversaciones que tienen comprobante pendiente de validacion manual.",
        rows: prioritizedRows.filter((row) => getConversationPriority(row) === "high"),
        emptyLabel: "No hay pagos pendientes en este momento."
      },
      {
        key: "recent",
        title: "Recientes",
        description: "Actividad reciente para seguir respondiendo sin recorrer todo el historial.",
        rows: prioritizedRows.filter((row) => getConversationPriority(row) === "medium"),
        emptyLabel: "No hay conversaciones recientes para mostrar."
      },
      {
        key: "all",
        title: "Todas",
        description: "Resto del historial operativo del inbox.",
        rows: prioritizedRows.filter((row) => getConversationPriority(row) === "low"),
        emptyLabel: "No quedan conversaciones fuera de los grupos prioritarios."
      }
    ],
    [prioritizedRows]
  );

  const hasSearchResults = visibleRows.length > 0;
  const isSearching = search.trim().length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
      <header className="border-b border-[color:var(--border)] bg-surface/85 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Inbox</p>
            <h2 className="mt-1 text-base font-semibold">Conversaciones</h2>
            <p className="mt-1 text-[11px] text-muted">WhatsApp en tiempo real, con prioridad visible y mejor encontrabilidad operativa.</p>
          </div>
          <InboxBadge active={readOnly}>Demo</InboxBadge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-[color:var(--border)] bg-card/70 p-2.5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Activas</p>
            <p className="mt-1.5 text-lg font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-card/70 p-2.5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">No leidas</p>
            <p className="mt-1.5 text-lg font-semibold">{unread}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-bg/70 px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nombre o telefono"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
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
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-card/40 px-5 text-center">
            <MessageSquareText className="h-8 w-8 text-muted" />
            <p className="mt-3 text-base font-semibold">{isSearching ? "No encontramos conversaciones para esa busqueda" : "Todavia no hay conversaciones visibles"}</p>
            <p className="mt-1 text-xs leading-6 text-muted">
              {isSearching
                ? "Proba con otro nombre, apellido, telefono o limpia la busqueda para volver al listado completo."
                : "Cuando entren mensajes por WhatsApp o limpies los filtros actuales, las conversaciones van a aparecer aca para gestionarlas desde el portal."}
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

        {!loading && hasSearchResults
          ? groupedRows.map((group) => {
              const isCollapsed = collapsedGroups[group.key] ?? false;
              return (
                <section key={group.key} className="rounded-2xl border border-[color:var(--border)] bg-card/40">
                  <button
                    type="button"
                    onClick={() => setCollapsedGroups((current) => ({ ...current, [group.key]: !isCollapsed }))}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{group.title}</p>
                        <InboxBadge active={group.key === "pending"}>{group.rows.length}</InboxBadge>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted">{group.description}</p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs text-muted">
                      {isCollapsed ? (
                        <>
                          Expandir
                          <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Colapsar
                          <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      )}
                    </span>
                  </button>

                  {!isCollapsed ? (
                    <div className="border-t border-[color:var(--border)] px-3 pb-3 pt-2">
                      {group.rows.length ? (
                        <div className="space-y-2.5">
                          {group.rows.map((row) => (
                            <ConversationRow
                              key={row.id}
                              row={row}
                              selected={selectedId === row.id}
                              onSelect={() => onSelect(row.id)}
                              onMarkHot={() => onMarkHot(row.id)}
                              onClose={() => onClose(row.id)}
                              disabled={readOnly}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-bg/40 px-4 py-3 text-xs text-muted">
                          {group.emptyLabel}
                        </div>
                      )}
                    </div>
                  ) : null}
                </section>
              );
            })
          : null}
      </div>
    </div>
  );
}

function buildSearchHaystack(row: ConversationRowData) {
  const values = [
    row.contact?.name,
    row.contact?.phone,
    row.contact?.email,
    row.contact?.id,
    row.lastMessagePreview,
    row.transferPaymentOrderId
  ]
    .filter(Boolean)
    .join(" ");

  return normalizeText(values).join(" ");
}
