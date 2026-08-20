"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, Search, Trash2 } from "lucide-react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type {
  PortalInventoryPagination,
  PortalInventoryProduct,
  PortalInventorySummary
} from "@/lib/api";
import {
  BULK_STOCK_REASONS,
  MAX_BULK_STOCK_ITEMS,
  MAX_BULK_STOCK_QUANTITY,
  buildBulkStockPayloadFingerprint,
  buildBulkStockRequestItems,
  isSemanticallyValidBulkStockResult,
  paginateBulkStockDrafts,
  rebaseBulkStockConflict,
  resolveInventoryPageCorrection,
  resolveBulkStockAttempt,
  summarizeBulkStockDrafts,
  updateBulkStockDraft,
  validateBulkStockDraft,
  type BulkStockAttempt,
  type BulkStockDraft,
  type BulkStockDrafts,
  type BulkStockFilters,
  type BulkStockProductSource,
  type BulkStockReason
} from "@/lib/inventory-bulk-stock";

const INVENTORY_PAGE_SIZE = 50;

const REASON_OPTIONS: Array<{ value: BulkStockReason; label: string }> = [
  { value: "initial_stock", label: "Carga inicial" },
  { value: "physical_count", label: "Conteo fisico" },
  { value: "inventory_correction", label: "Correccion de inventario" },
  { value: "other", label: "Otro" }
];

type Feedback = { tone: "success" | "warning" | "error"; text: string };
type DiscardIntent = "discard" | "exit" | null;

export function InventoryBulkStockWorkspace({
  initialProducts,
  initialPagination,
  initialSummary,
  tenantId = null
}: {
  initialProducts: PortalInventoryProduct[];
  initialPagination: PortalInventoryPagination;
  initialSummary: PortalInventorySummary;
  tenantId?: string | null;
}) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [pagination, setPagination] = useState(initialPagination);
  const [inventorySummary, setInventorySummary] = useState(initialSummary);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<BulkStockFilters["stockFilter"]>("all");
  const [appliedFilters, setAppliedFilters] = useState<BulkStockFilters>({ search: "", stockFilter: "all" });
  const [showModifiedOnly, setShowModifiedOnly] = useState(false);
  const [modifiedPage, setModifiedPage] = useState(1);
  const [drafts, setDrafts] = useState<BulkStockDrafts>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reason, setReason] = useState<BulkStockReason>("initial_stock");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<BulkStockAttempt | null>(null);
  const [discardIntent, setDiscardIntent] = useState<DiscardIntent>(null);
  const [pendingExitHref, setPendingExitHref] = useState("/app/inventory");
  const productsRequestIdRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const navigationBypassRef = useRef(false);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const draftSummary = useMemo(() => summarizeBulkStockDrafts(drafts), [drafts]);
  const modifiedDraftPage = useMemo(
    () => paginateBulkStockDrafts(drafts, appliedFilters, modifiedPage, INVENTORY_PAGE_SIZE),
    [appliedFilters, drafts, modifiedPage]
  );
  const reviewItems = useMemo(() => buildBulkStockRequestItems(drafts), [drafts]);

  useEffect(() => {
    if (modifiedDraftPage.page !== modifiedPage) setModifiedPage(modifiedDraftPage.page);
  }, [modifiedDraftPage.page, modifiedPage]);

  useEffect(() => {
    if (draftSummary.draftItems === 0) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [draftSummary.draftItems]);

  useEffect(() => {
    if (draftSummary.draftItems === 0) return;
    const guardClientNavigation = (event: MouseEvent) => {
      if (navigationBypassRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash
      ) return;
      event.preventDefault();
      event.stopPropagation();
      if (saving) return;
      setPendingExitHref(`${destination.pathname}${destination.search}${destination.hash}`);
      setDiscardIntent("exit");
    };
    document.addEventListener("click", guardClientNavigation, true);
    return () => document.removeEventListener("click", guardClientNavigation, true);
  }, [draftSummary.draftItems, saving]);

  useEffect(() => {
    if (draftSummary.draftItems === 0) return;
    const navigation = (window as unknown as {
      navigation?: {
        addEventListener: (type: "navigate", listener: (event: Event) => void) => void;
        removeEventListener: (type: "navigate", listener: (event: Event) => void) => void;
      };
    }).navigation;
    if (!navigation) return;
    const guardHistoryNavigation = (rawEvent: Event) => {
      const event = rawEvent as Event & { destination?: { url?: string }; canIntercept?: boolean };
      if (navigationBypassRef.current || !event.cancelable || event.canIntercept === false) return;
      const destinationUrl = event.destination?.url;
      if (!destinationUrl) return;
      const destination = new URL(destinationUrl, window.location.href);
      if (destination.href === window.location.href) return;
      event.preventDefault();
      if (saving) return;
      setPendingExitHref(`${destination.pathname}${destination.search}${destination.hash}`);
      setDiscardIntent("exit");
    };
    navigation.addEventListener("navigate", guardHistoryNavigation);
    return () => navigation.removeEventListener("navigate", guardHistoryNavigation);
  }, [draftSummary.draftItems, saving]);

  function buildInventoryUrl(path: string, params?: Record<string, string>) {
    const query = new URLSearchParams(params);
    if (tenantId) query.set("tenantId", tenantId);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return `${path}${suffix}`;
  }

  async function loadProducts(nextPage: number, filters: BulkStockFilters, allowPageCorrection = true): Promise<boolean> {
    const requestId = productsRequestIdRef.current + 1;
    productsRequestIdRef.current = requestId;
    setLoading(true);
    setFeedback(null);
    const normalizedFilters: BulkStockFilters = {
      search: filters.search.trim(),
      stockFilter: filters.stockFilter
    };
    try {
      const params: Record<string, string> = {
        page: String(nextPage),
        pageSize: String(INVENTORY_PAGE_SIZE)
      };
      if (normalizedFilters.search) params.search = normalizedFilters.search;
      if (normalizedFilters.stockFilter !== "all") params.stockFilter = normalizedFilters.stockFilter;
      const response = await fetch(buildInventoryUrl("/api/app/inventory/products", params), { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(resolveBulkStockErrorMessage(json?.error, response.status));
      if (!Array.isArray(json?.products) || !isInventoryPagination(json?.pagination) || !isInventorySummary(json?.summary)) {
        throw new Error("No se pudo interpretar la respuesta de inventario.");
      }
      if (productsRequestIdRef.current !== requestId) return false;
      const correctionPage = resolveInventoryPageCorrection(nextPage, json.pagination.totalPages);
      if (correctionPage !== null) {
        if (!allowPageCorrection) throw new Error("Inventario devolvio una pagina fuera de rango.");
        return loadProducts(correctionPage, normalizedFilters, false);
      }
      setProducts(json.products);
      setPagination(json.pagination);
      setInventorySummary(json.summary);
      setAppliedFilters(normalizedFilters);
      return true;
    } catch (error) {
      if (productsRequestIdRef.current !== requestId) return false;
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "No se pudo cargar inventario."
      });
      return false;
    } finally {
      if (productsRequestIdRef.current === requestId) setLoading(false);
    }
  }

  async function applyFilters() {
    setModifiedPage(1);
    await loadProducts(1, { search, stockFilter });
  }

  function updateTarget(product: BulkStockProductSource, rawTargetQuantity: string) {
    setDrafts((current) => updateBulkStockDraft(current, product, rawTargetQuantity));
    setFeedback(null);
    setSubmitError(null);
  }

  function handleTargetKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const inputs = Array.from(
      tableRef.current?.querySelectorAll<HTMLInputElement>('input[data-bulk-stock-input="true"]:not(:disabled)') || []
    );
    const currentIndex = inputs.indexOf(event.currentTarget);
    const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
    const nextInput = inputs[nextIndex];
    if (!nextInput) return;
    nextInput.focus();
    nextInput.select();
  }

  function openReview() {
    if (draftSummary.conflictItems > 0) {
      const message = `Revisa ${draftSummary.conflictItems} conflicto${draftSummary.conflictItems === 1 ? "" : "s"} de stock antes de continuar.`;
      setFeedback({ tone: "error", text: message });
      toast.error("Hay stock actualizado", message);
      return;
    }
    if (draftSummary.invalidItems > 0) {
      const message = `Revisa ${draftSummary.invalidItems} cantidad${draftSummary.invalidItems === 1 ? "" : "es"} invalida${draftSummary.invalidItems === 1 ? "" : "s"} antes de continuar.`;
      setFeedback({ tone: "error", text: message });
      toast.error("Hay cantidades invalidas", message);
      return;
    }
    if (reviewItems.length === 0) {
      const message = "Ingresa al menos una cantidad diferente al stock actual.";
      setFeedback({ tone: "warning", text: message });
      toast.error("No hay cambios para revisar", message);
      return;
    }
    if (reviewItems.length > MAX_BULK_STOCK_ITEMS) {
      const message = `El maximo por operacion es ${MAX_BULK_STOCK_ITEMS.toLocaleString("es-AR")} productos. Reduce la seleccion y vuelve a intentar.`;
      setFeedback({ tone: "error", text: message });
      toast.error("Demasiados productos", message);
      return;
    }
    setSubmitError(null);
    setConfirmed(false);
    setReviewOpen(true);
  }

  async function submitBulkAdjustment() {
    if (submitInFlightRef.current || saving) return;
    const normalizedNote = note.trim() || null;
    if (!BULK_STOCK_REASONS.includes(reason)) {
      setSubmitError("Selecciona un motivo valido.");
      return;
    }
    if (reason === "other" && !normalizedNote) {
      setSubmitError("Describe el motivo cuando seleccionas Otro.");
      return;
    }
    if (!confirmed) {
      setSubmitError("Confirma explicitamente la aplicacion de los ajustes.");
      return;
    }
    if (draftSummary.invalidItems > 0 || draftSummary.conflictItems > 0 || reviewItems.length === 0 || reviewItems.length > MAX_BULK_STOCK_ITEMS) {
      setSubmitError("Los cambios ya no son validos. Cierra la revision y verifica las cantidades.");
      return;
    }

    const fingerprint = buildBulkStockPayloadFingerprint({ reason, note: normalizedNote, items: reviewItems });
    const nextAttempt = resolveBulkStockAttempt(attempt, fingerprint);
    setAttempt(nextAttempt);
    submitInFlightRef.current = true;
    setSaving(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/app/inventory/bulk-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: nextAttempt.idempotencyKey,
          reason,
          note: normalizedNote,
          items: reviewItems
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw createBulkStockSubmissionError(
          resolveBulkStockErrorMessage(json?.error, response.status),
          isConfirmedBulkStockRejection(json?.error, response.status) ? "rejected" : "unknown",
          response.status,
          json?.error,
          json?.details
        );
      }
      if (!isSemanticallyValidBulkStockResult(json, reviewItems)) {
        throw createBulkStockSubmissionError(
          "El ajuste fue recibido, pero no pudimos confirmar la respuesta. Reintenta con los mismos datos para verificarlo sin duplicar movimientos.",
          "unknown"
        );
      }

      const changedItems = json.summary.changedItems;
      const refreshed = await loadProducts(pagination.page, appliedFilters);
      setDrafts({});
      setModifiedPage(1);
      setShowModifiedOnly(false);
      setAttempt(null);
      setConfirmed(false);
      setNote("");
      setReviewOpen(false);
      const successText = refreshed
        ? `${changedItems} producto${changedItems === 1 ? "" : "s"} actualizado${changedItems === 1 ? "" : "s"}.`
        : `${changedItems} producto${changedItems === 1 ? "" : "s"} actualizado${changedItems === 1 ? "" : "s"}. Actualiza la vista para ver el saldo final.`;
      setFeedback({ tone: refreshed ? "success" : "warning", text: successText });
      toast.success("Ajuste masivo aplicado", successText);
    } catch (error) {
      const outcome = getBulkStockSubmissionOutcome(error);
      const conflicts = getInventoryChangedConflicts(error);
      if (conflicts.length > 0) {
        setDrafts((current) => conflicts.reduce((next, conflict) => rebaseBulkStockConflict(next, conflict), current));
        setAttempt(null);
        setConfirmed(false);
        setReviewOpen(false);
        const conflict = conflicts[0];
        const draft = drafts[conflict.productId];
        const extraConflicts = conflicts.length > 1 ? ` Hay ${conflicts.length - 1} producto${conflicts.length === 2 ? "" : "s"} adicional${conflicts.length === 2 ? "" : "es"} con cambios.` : "";
        const message = `El stock de ${draft?.name || "un producto"} cambio de ${conflict.expectedCurrentQuantity} a ${conflict.currentQuantity}.${extraConflicts} Conservamos los objetivos; revisalos y confirmalos antes de reintentar.`;
        setSubmitError(null);
        await loadProducts(pagination.page, appliedFilters);
        setFeedback({ tone: "error", text: message });
        toast.error("Stock actualizado", message);
        return;
      }
      const message = outcome ? (error as Error).message : BULK_STOCK_UNCONFIRMED_MESSAGE;
      setSubmitError(message);
      setFeedback({ tone: "error", text: message });
      toast.error(outcome === "rejected" ? "El stock no fue modificado" : "Resultado sin confirmar", message);
    } finally {
      submitInFlightRef.current = false;
      setSaving(false);
    }
  }

  function requestExit() {
    if (draftSummary.draftItems === 0) {
      router.push("/app/inventory");
      return;
    }
    setPendingExitHref("/app/inventory");
    setDiscardIntent("exit");
  }

  function confirmDiscard() {
    setDrafts({});
    setAttempt(null);
    setFeedback(null);
    setModifiedPage(1);
    setShowModifiedOnly(false);
    const shouldExit = discardIntent === "exit";
    setDiscardIntent(null);
    if (shouldExit) {
      navigationBypassRef.current = true;
      router.push(pendingExitHref);
    }
  }

  const displayedRows: BulkStockProductSource[] = showModifiedOnly
    ? modifiedDraftPage.items.map(draftToProductSource)
    : products.map(productToProductSource);
  const activePagination = showModifiedOnly
    ? {
        page: modifiedDraftPage.page,
        pageSize: modifiedDraftPage.pageSize,
        totalItems: modifiedDraftPage.totalItems,
        totalPages: modifiedDraftPage.totalPages
      }
    : pagination;
  const displayedPage = activePagination.totalPages > 0 ? activePagination.page : 0;
  const pageStart = activePagination.totalItems > 0
    ? (activePagination.page - 1) * activePagination.pageSize + 1
    : 0;
  const pageEnd = activePagination.totalItems > 0
    ? Math.min(activePagination.totalItems, activePagination.page * activePagination.pageSize)
    : 0;
  const hasPreviousPage = activePagination.page > 1;
  const hasNextPage = activePagination.page < activePagination.totalPages;

  function navigatePage(nextPage: number) {
    if (showModifiedOnly) {
      setModifiedPage(nextPage);
      return;
    }
    void loadProducts(nextPage, appliedFilters);
  }

  return (
    <ClientPageShell
      title="Carga inicial / Ajuste masivo"
      description="Ingresa cantidades absolutas para muchos productos. Opturon calcula la diferencia y crea ajustes auditables en una sola operacion atomica."
      badge="Inventario"
      action={(
        <Button type="button" variant="secondary" onClick={requestExit} disabled={saving}>
          <ArrowLeft className="mr-2 size-4" />
          Volver al inventario
        </Button>
      )}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactStat label="Productos del filtro" value={String(inventorySummary.totalProducts)} />
        <CompactStat label="Con stock" value={String(inventorySummary.withStock)} />
        <CompactStat label="Sin stock" value={String(inventorySummary.withoutStock)} />
        <CompactStat label="Cambios pendientes" value={String(draftSummary.changedItems)} tone={draftSummary.changedItems > 0 ? "warning" : "default"} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Conteo de Inventario Base</CardTitle>
          <CardDescription>
            Deja vacio lo que no queres modificar. Los productos administrados por lotes no pueden ajustarse desde esta herramienta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
            <label className="relative block">
              <span className="sr-only">Buscar productos</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void applyFilters();
                }}
                placeholder="Nombre, codigo interno o SKU"
                disabled={saving}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="sr-only">Filtrar por estado de stock</span>
              <select
                aria-label="Filtrar por estado de stock"
                className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value as BulkStockFilters["stockFilter"])}
                disabled={saving}
              >
                <option value="all">Todos</option>
                <option value="with_stock">Con stock</option>
                <option value="without_stock">Sin stock</option>
              </select>
            </label>
            <Button type="button" variant="secondary" onClick={() => void applyFilters()} disabled={loading || saving}>
              {loading ? "Actualizando..." : "Aplicar filtros"}
            </Button>
            <Button
              type="button"
              variant={showModifiedOnly ? "default" : "secondary"}
              onClick={() => {
                setShowModifiedOnly((current) => !current);
                setModifiedPage(1);
              }}
              disabled={saving}
            >
              Solo modificados ({draftSummary.draftItems})
            </Button>
          </div>

          {feedback ? (
            <div aria-live="polite" className={feedbackClassName(feedback.tone)}>
              {feedback.text}
            </div>
          ) : null}

          <div ref={tableRef} className="overflow-x-auto rounded-2xl border border-[color:var(--border)]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Codigo / SKU</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Stock actual</th>
                  <th className="px-4 py-3">Nueva cantidad</th>
                  <th className="px-4 py-3 text-right">Diferencia</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((product) => {
                  const draft = drafts[product.productId];
                  const validation = draft ? validateBulkStockDraft(draft) : null;
                  const currentQuantity = draft?.expectedCurrentQuantity ?? product.currentQuantity;
                  const lotBased = product.inventoryTrackingMode === "lot_based";
                  const errorId = `bulk-stock-error-${product.productId}`;
                  return (
                    <tr key={product.productId} className="border-t border-[color:var(--border)] align-middle">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs">{product.internalCode || "Sin codigo"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{product.sku || "Sin SKU"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{product.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[product.categoryName, product.unitOfMeasure, product.status === "archived" ? "Archivado" : null].filter(Boolean).join(" · ") || "Inventario Base"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{currentQuantity}</td>
                      <td className="px-4 py-3">
                        <Input
                          data-bulk-stock-input="true"
                          aria-label={`Nueva cantidad para ${product.name}`}
                          aria-invalid={Boolean((validation && !validation.valid) || draft?.conflict)}
                          aria-describedby={(validation && !validation.valid) || draft?.conflict ? errorId : undefined}
                          className="w-36 text-right font-medium tabular-nums"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max={MAX_BULK_STOCK_QUANTITY}
                          step="1"
                          placeholder={String(currentQuantity)}
                          value={draft?.rawTargetQuantity ?? ""}
                          onChange={(event) => updateTarget(product, event.target.value)}
                          onKeyDown={handleTargetKeyDown}
                          disabled={saving || loading || lotBased}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {validation?.valid && validation.delta !== null ? signed(validation.delta) : "-"}
                      </td>
                      <td id={errorId} className="px-4 py-3">{renderDraftStatus(draft, validation, lotBased)}</td>
                    </tr>
                  );
                })}
                {!displayedRows.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {showModifiedOnly ? "No hay productos modificados para estos filtros." : "No hay productos para estos filtros."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <nav
              aria-label={showModifiedOnly ? "Paginacion de productos modificados" : "Paginacion de productos"}
              className="grid min-h-14 min-w-[36rem] grid-cols-[7rem_minmax(16rem,1fr)_7rem] items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-muted/20 px-3 py-2"
            >
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-28 shrink-0"
                  disabled={!hasPreviousPage || loading || saving}
                  onClick={() => navigatePage(activePagination.page - 1)}
                >
                  <ChevronLeft className="mr-1 size-4" />
                  Anterior
                </Button>
              </div>
              <p aria-live="polite" className="min-w-[16rem] whitespace-nowrap text-center text-sm tabular-nums text-muted-foreground">
                Pagina {displayedPage} de {activePagination.totalPages} · {pageStart}-{pageEnd} de {activePagination.totalItems}
              </p>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-28 shrink-0"
                  disabled={!hasNextPage || loading || saving}
                  onClick={() => navigatePage(activePagination.page + 1)}
                >
                  Siguiente
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </nav>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-muted/20 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-medium">{draftSummary.changedItems} producto{draftSummary.changedItems === 1 ? "" : "s"} con cambios</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {draftSummary.increases} aumentos · {draftSummary.reductions} reducciones · +{draftSummary.unitsAdded} / -{draftSummary.unitsRemoved} unidades
              </p>
              {draftSummary.invalidItems > 0 ? <p className="mt-1 text-xs text-red-300">{draftSummary.invalidItems} cantidades requieren revision.</p> : null}
              {draftSummary.conflictItems > 0 ? <p className="mt-1 text-xs text-red-300">{draftSummary.conflictItems} productos cambiaron y requieren una decision nueva.</p> : null}
              {draftSummary.changedItems >= MAX_BULK_STOCK_ITEMS - 1 ? (
                <p className={`mt-1 text-xs ${draftSummary.changedItems > MAX_BULK_STOCK_ITEMS ? "text-red-300" : "text-amber-200"}`}>
                  Limite por operacion: {MAX_BULK_STOCK_ITEMS.toLocaleString("es-AR")} productos ({draftSummary.changedItems} seleccionados).
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDiscardIntent("discard")}
                disabled={draftSummary.draftItems === 0 || saving}
              >
                <Trash2 className="mr-2 size-4" />
                Descartar cambios
              </Button>
              <Button
                type="button"
                onClick={openReview}
                disabled={draftSummary.changedItems === 0 || draftSummary.conflictItems > 0 || draftSummary.changedItems > MAX_BULK_STOCK_ITEMS || saving}
              >
                <ClipboardCheck className="mr-2 size-4" />
                Revisar cambios ({draftSummary.changedItems})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (saving) return;
          setReviewOpen(open);
          if (!open) {
            setConfirmed(false);
            setSubmitError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar y aplicar ajustes</DialogTitle>
            <DialogDescription>
              Se enviaran solamente los productos modificados. La operacion es atomica y creara movimientos auditables de inventario.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReviewStat label="Productos" value={String(draftSummary.changedItems)} />
              <ReviewStat label="Aumentos" value={String(draftSummary.increases)} />
              <ReviewStat label="Reducciones" value={String(draftSummary.reductions)} />
              <ReviewStat label="Unidades" value={`+${draftSummary.unitsAdded} / -${draftSummary.unitsRemoved}`} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>Motivo</span>
                <select
                  className="h-10 rounded-xl border border-[color:var(--border)] bg-background px-3 text-sm"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value as BulkStockReason);
                    setConfirmed(false);
                    setSubmitError(null);
                  }}
                  disabled={saving}
                >
                  {REASON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span>Nota {reason === "other" ? "(obligatoria)" : "(opcional)"}</span>
                <Input
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setConfirmed(false);
                    setSubmitError(null);
                  }}
                  placeholder="Ej. conteo deposito principal"
                  maxLength={500}
                  disabled={saving}
                />
              </label>
            </div>

            <div className="max-h-64 overflow-auto rounded-2xl border border-[color:var(--border)]">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="sticky top-0 bg-card text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2 text-right">Actual</th>
                    <th className="px-3 py-2 text-right">Nueva</th>
                    <th className="px-3 py-2 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewItems.map((item) => {
                    const draft = drafts[item.productId];
                    return (
                      <tr key={item.productId} className="border-t border-[color:var(--border)]">
                        <td className="px-3 py-2">
                          <p className="font-medium">{draft?.name || "Producto"}</p>
                          <p className="text-xs text-muted-foreground">{draft?.internalCode || draft?.sku || "Sin codigo"}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.expectedCurrentQuantity}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{item.targetQuantity}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{signed(item.targetQuantity - item.expectedCurrentQuantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-muted/25 p-4 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4"
                checked={confirmed}
                onChange={(event) => {
                  setConfirmed(event.target.checked);
                  setSubmitError(null);
                }}
                disabled={saving}
              />
              <span>
                Confirmo que quiero aplicar ajustes de inventario a {draftSummary.changedItems} producto{draftSummary.changedItems === 1 ? "" : "s"}.
              </span>
            </label>

            {submitError ? <div role="alert" className={feedbackClassName("error")}>{submitError}</div> : null}
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => setReviewOpen(false)} disabled={saving}>
              Volver a editar
            </Button>
            <Button
              type="button"
              onClick={() => void submitBulkAdjustment()}
              disabled={saving || !confirmed || (reason === "other" && !note.trim())}
            >
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ClipboardCheck className="mr-2 size-4" />}
              {saving ? "Aplicando ajustes..." : `Aplicar ajustes (${draftSummary.changedItems})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(discardIntent)}
        onOpenChange={(open) => {
          if (!open) setDiscardIntent(null);
        }}
        title={discardIntent === "exit" ? "Salir y descartar cambios" : "Descartar todos los cambios"}
        description={`Se perderan ${draftSummary.draftItems} cantidad${draftSummary.draftItems === 1 ? "" : "es"} ingresada${draftSummary.draftItems === 1 ? "" : "s"}. El stock guardado no sera modificado.`}
        confirmText={discardIntent === "exit" ? "Descartar y salir" : "Descartar cambios"}
        cancelText="Seguir editando"
        variant="destructive"
        onConfirm={confirmDiscard}
      />
    </ClientPageShell>
  );
}

function productToProductSource(product: PortalInventoryProduct): BulkStockProductSource {
  return {
    productId: product.id,
    name: product.name,
    internalCode: product.internalCode || null,
    sku: product.sku || null,
    categoryName: product.categoryName || null,
    unitOfMeasure: product.unitOfMeasure || null,
    status: product.status || null,
    inventoryTrackingMode: product.inventoryTrackingMode === "lot_based" ? "lot_based" : "legacy",
    currentQuantity: normalizeProductStock(product.stock)
  };
}

function draftToProductSource(draft: BulkStockDraft): BulkStockProductSource {
  return {
    productId: draft.productId,
    name: draft.name,
    internalCode: draft.internalCode,
    sku: draft.sku,
    categoryName: draft.categoryName,
    unitOfMeasure: draft.unitOfMeasure,
    status: draft.status,
    inventoryTrackingMode: draft.inventoryTrackingMode,
    currentQuantity: draft.expectedCurrentQuantity
  };
}

function renderDraftStatus(
  draft: BulkStockDraft | undefined,
  validation: ReturnType<typeof validateBulkStockDraft> | null,
  lotBased: boolean
) {
  if (lotBased) return <Badge variant="warning">Gestionado por lotes</Badge>;
  if (!draft) return <Badge variant="muted">Sin cambios</Badge>;
  if (draft.conflict) {
    return (
      <div>
        <Badge variant="danger">Stock actualizado</Badge>
        <p className="mt-1 max-w-60 text-xs text-red-300">
          Cambio de {draft.conflict.previousExpectedQuantity} a {draft.conflict.currentQuantity}. Objetivo conservado: {draft.rawTargetQuantity}. Edita la cantidad para confirmar tu decision.
        </p>
      </div>
    );
  }
  if (!validation?.valid) {
    return (
      <div>
        <Badge variant="danger">Cantidad invalida</Badge>
        <p className="mt-1 max-w-52 text-xs text-red-300">Usa un entero entre 0 y {MAX_BULK_STOCK_QUANTITY.toLocaleString("es-AR")}.</p>
      </div>
    );
  }
  if ((validation.delta || 0) > 0) return <Badge variant="success">Aumento pendiente</Badge>;
  if ((validation.delta || 0) < 0) return <Badge variant="warning">Reduccion pendiente</Badge>;
  return <Badge variant="muted">Sin cambios</Badge>;
}

const BULK_STOCK_UNCONFIRMED_MESSAGE =
  "No pudimos confirmar el resultado. El ajuste puede haberse aplicado; reintenta con los mismos datos. Conservaremos la misma clave segura para verificarlo sin duplicar movimientos.";

type BulkStockSubmissionOutcome = "rejected" | "unknown";
type BulkStockSubmissionError = Error & {
  bulkStockOutcome: BulkStockSubmissionOutcome;
  status: number | null;
  code: string | null;
  details: unknown;
};

function createBulkStockSubmissionError(
  message: string,
  outcome: BulkStockSubmissionOutcome,
  status: number | null = null,
  code: unknown = null,
  details: unknown = null
): BulkStockSubmissionError {
  const error = new Error(message) as BulkStockSubmissionError;
  error.bulkStockOutcome = outcome;
  error.status = status;
  error.code = typeof code === "string" ? code : null;
  error.details = details;
  return error;
}

function getBulkStockSubmissionOutcome(error: unknown): BulkStockSubmissionOutcome | null {
  if (!(error instanceof Error) || !("bulkStockOutcome" in error)) return null;
  const outcome = (error as Partial<BulkStockSubmissionError>).bulkStockOutcome;
  return outcome === "rejected" || outcome === "unknown" ? outcome : null;
}

function getInventoryChangedConflicts(error: unknown): Array<{
  productId: string;
  expectedCurrentQuantity: number;
  currentQuantity: number;
}> {
  if (!(error instanceof Error) || !("code" in error) || !("details" in error)) return [];
  const candidate = error as Partial<BulkStockSubmissionError>;
  if (candidate.code !== "inventory_changed" || !candidate.details || typeof candidate.details !== "object") return [];
  const details = candidate.details as Record<string, unknown>;
  const rawConflicts = Array.isArray(details.conflicts) ? details.conflicts : [details];
  return rawConflicts.flatMap((rawConflict) => {
    if (!rawConflict || typeof rawConflict !== "object") return [];
    const conflict = rawConflict as Record<string, unknown>;
    if (
      typeof conflict.productId !== "string" ||
      !isNonNegativeInteger(conflict.expectedCurrentQuantity) ||
      !isNonNegativeInteger(conflict.currentQuantity)
    ) return [];
    return [{
      productId: conflict.productId,
      expectedCurrentQuantity: conflict.expectedCurrentQuantity,
      currentQuantity: conflict.currentQuantity
    }];
  });
}

function isConfirmedBulkStockRejection(errorCode?: string | null, status?: number) {
  const code = String(errorCode || "").trim().toLowerCase();
  return (
    status === 400 ||
    status === 403 ||
    status === 404 ||
    status === 409 ||
    status === 422 ||
    code === "forbidden" ||
    code.includes("permission") ||
    code.includes("idempotency") ||
    code.includes("inventory_changed") ||
    code.includes("concurrent") ||
    code.includes("lot_based") ||
    code.includes("lot-based") ||
    code.includes("product_not_found") ||
    code.includes("inventory_product_not_found") ||
    code.includes("quantity") ||
    code.includes("target")
  );
}

function resolveBulkStockErrorMessage(errorCode?: string | null, status?: number) {
  const code = String(errorCode || "").trim().toLowerCase();
  if (code.includes("idempotency")) {
    return "La clave segura ya fue usada con datos diferentes. Los cambios se conservaron; revisa el contenido antes de generar un nuevo intento.";
  }
  if (code.includes("inventory_changed") || code.includes("concurrent")) {
    return "El stock cambio desde que abriste la pantalla. No se aplico ningun ajuste; actualiza los datos y revisa nuevamente.";
  }
  if (status === 409) {
    return "La operacion entro en conflicto con otro cambio. No se aplico ningun ajuste; actualiza los datos y revisa nuevamente.";
  }
  if (status === 403 || code === "forbidden" || code.includes("permission")) {
    return "No tenes permiso para realizar ajustes sensibles de inventario.";
  }
  if (code.includes("lot_based") || code.includes("lot-based")) {
    return "Uno de los productos se administra por lotes y no puede ajustarse desde esta herramienta.";
  }
  if (code.includes("product_not_found") || code.includes("inventory_product_not_found")) {
    return "Uno de los productos ya no existe o no pertenece a este tenant.";
  }
  if (code.includes("quantity") || code.includes("target")) {
    return `Hay una cantidad invalida. Usa enteros entre 0 y ${MAX_BULK_STOCK_QUANTITY.toLocaleString("es-AR")}.`;
  }
  if (status === 400) return "El ajuste contiene datos invalidos. Revisa cantidades, motivo y productos.";
  return BULK_STOCK_UNCONFIRMED_MESSAGE;
}

function isInventoryPagination(value: unknown): value is PortalInventoryPagination {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortalInventoryPagination>;
  return (
    isPositiveInteger(candidate.page) &&
    isPositiveInteger(candidate.pageSize) &&
    isNonNegativeInteger(candidate.totalItems) &&
    isNonNegativeInteger(candidate.totalPages) &&
    candidate.totalPages === (candidate.totalItems > 0 ? Math.ceil(candidate.totalItems / candidate.pageSize) : 0) &&
    (candidate.totalPages > 0 || candidate.page === 1)
  );
}

function isInventorySummary(value: unknown): value is PortalInventorySummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PortalInventorySummary>;
  return (
    isNonNegativeInteger(candidate.totalProducts) &&
    isNonNegativeInteger(candidate.withStock) &&
    isNonNegativeInteger(candidate.withoutStock) &&
    candidate.withStock + candidate.withoutStock === candidate.totalProducts
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function normalizeProductStock(value: number) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized >= 0 ? normalized : 0;
}

function signed(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value > 0 ? `+${value}` : String(value);
}

function feedbackClassName(tone: Feedback["tone"]) {
  if (tone === "success") return "rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100";
  if (tone === "warning") return "rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100";
  return "rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100";
}

function CompactStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone === "warning" ? "border-amber-400/25 bg-amber-500/10" : "border-[color:var(--border)] bg-card/80"}`}>
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
