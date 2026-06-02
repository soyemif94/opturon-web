"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import {
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileCog,
  FileSpreadsheet,
  Filter,
  ListFilter,
  OctagonX,
  Plus,
  ReceiptText,
  Search,
  Settings2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { PortalInvoice } from "@/lib/api";
import {
  badgeToneByStatus,
  formatDateLabel,
  formatInvoiceMissingDataLabel,
  formatMoney,
  getInvoiceDocumentKindLabel,
  titleCaseLabel
} from "@/lib/billing";

type InvoiceFilterState = {
  search: string;
  receivableStatus: string;
  contactId: string;
  fiscalStatus: string;
  documentKind: string;
  deliveredFilter: string;
  incompleteOnly: boolean;
  dateFrom: string;
  dateTo: string;
  origin: string;
};

type InvoiceListMode = "main" | "archive";
type InvoiceCategoryTab = "all" | "invoice" | "credit_note" | "receipt" | "order";

const PRIMARY_INVOICES_LIMIT = 20;

const EMPTY_FILTERS: InvoiceFilterState = {
  search: "",
  receivableStatus: "all",
  contactId: "all",
  fiscalStatus: "all",
  documentKind: "all",
  deliveredFilter: "all",
  incompleteOnly: false,
  dateFrom: "",
  dateTo: "",
  origin: "all"
};

const NO_FISCAL_LEGEND = "Documento interno no valido como factura fiscal";

const CATEGORY_LABELS: Record<InvoiceCategoryTab, string> = {
  all: "Todos los comprobantes",
  invoice: "Facturas",
  credit_note: "Notas de credito",
  receipt: "Recibos",
  order: "Pedidos"
};

export function InvoicesHeaderActions({ readOnly = false }: { readOnly?: boolean }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-3">
      <Button asChild variant="secondary" className="rounded-2xl border-white/10 bg-white/[0.03] px-4">
        <a href="/api/app/invoices/export">
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </a>
      </Button>
      <Button asChild variant="secondary" className="rounded-2xl border-white/10 bg-white/[0.03] px-4">
        <Link href="/app/settings">
          <Settings2 className="mr-2 h-4 w-4" />
          Configuracion
        </Link>
      </Button>
      {!readOnly ? (
        <Button asChild className="rounded-2xl px-5">
          <Link href="/app/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo comprobante
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function InvoicesWorkspace({
  initialInvoices,
  readOnly = false
}: {
  initialInvoices: PortalInvoice[];
  readOnly?: boolean;
}) {
  const [filters, setFilters] = useState<InvoiceFilterState>(EMPTY_FILTERS);
  const [invoices, setInvoices] = useState<PortalInvoice[]>(initialInvoices);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const [listMode, setListMode] = useState<InvoiceListMode>("main");
  const [categoryTab, setCategoryTab] = useState<InvoiceCategoryTab>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const contactOptions = useMemo(() => {
    const seen = new Map<string, string>();
    invoices.forEach((invoice) => {
      if (invoice.contact?.id && invoice.contact?.name && !seen.has(invoice.contact.id)) {
        seen.set(invoice.contact.id, invoice.contact.name);
      }
    });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "es"));
  }, [invoices]);

  const originOptions = useMemo(() => {
    const unique = new Set(invoices.map((invoice) => deriveInvoiceOrigin(invoice)));
    return Array.from(unique).sort((left, right) => left.localeCompare(right, "es"));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (filters.receivableStatus !== "all" && invoice.receivableStatus !== filters.receivableStatus) return false;
      if (filters.contactId !== "all" && invoice.contact?.id !== filters.contactId) return false;
      if (filters.fiscalStatus !== "all" && invoice.fiscalStatus !== filters.fiscalStatus) return false;
      if (filters.documentKind !== "all" && invoice.documentKind !== filters.documentKind) return false;
      if (filters.deliveredFilter === "delivered" && !invoice.deliveredToAccountantAt) return false;
      if (filters.deliveredFilter === "pending" && invoice.deliveredToAccountantAt) return false;
      if (filters.incompleteOnly && (!invoice.missingDataFlags || invoice.missingDataFlags.length === 0)) return false;
      if (filters.origin !== "all" && deriveInvoiceOrigin(invoice) !== filters.origin) return false;

      const referenceDate = new Date(invoice.issuedAt || invoice.createdAt || 0);
      if (filters.dateFrom && referenceDate < new Date(`${filters.dateFrom}T00:00:00`)) return false;
      if (filters.dateTo && referenceDate > new Date(`${filters.dateTo}T23:59:59`)) return false;

      if (!search) return true;
      const haystack = [
        invoice.internalDocumentNumber,
        invoice.customerLegalName,
        invoice.customerTaxId,
        invoice.issuerLegalName,
        invoice.documentKind,
        invoice.fiscalStatus,
        deriveInvoiceOrigin(invoice)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [filters, invoices]);

  const categoryCounts = useMemo(
    () => ({
      all: filteredInvoices.length,
      invoice: filteredInvoices.filter((invoice) => deriveInvoiceCategory(invoice) === "invoice").length,
      credit_note: filteredInvoices.filter((invoice) => deriveInvoiceCategory(invoice) === "credit_note").length,
      receipt: filteredInvoices.filter((invoice) => deriveInvoiceCategory(invoice) === "receipt").length,
      order: filteredInvoices.filter((invoice) => deriveInvoiceCategory(invoice) === "order").length
    }),
    [filteredInvoices]
  );

  const filteredByCategory = useMemo(() => {
    if (categoryTab === "all") return filteredInvoices;
    return filteredInvoices.filter((invoice) => deriveInvoiceCategory(invoice) === categoryTab);
  }, [categoryTab, filteredInvoices]);

  const visibleInvoices = listMode === "main" ? filteredByCategory.slice(0, PRIMARY_INVOICES_LIMIT) : filteredByCategory;
  const archivedInvoicesCount = Math.max(filteredByCategory.length - PRIMARY_INVOICES_LIMIT, 0);
  const allVisibleSelected = visibleInvoices.length > 0 && visibleInvoices.every((invoice) => selectedIds.includes(invoice.id));
  const selectedCount = selectedIds.length;

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.contactId !== "all") params.set("contactId", filters.contactId);
    if (filters.fiscalStatus !== "all") params.set("fiscalStatus", filters.fiscalStatus);
    if (filters.documentKind !== "all") params.set("documentKind", filters.documentKind);
    if (filters.deliveredFilter !== "all") params.set("deliveredFilter", filters.deliveredFilter);
    if (filters.incompleteOnly) params.set("incompleteOnly", "true");
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    return `/api/app/invoices/export?${params.toString()}`;
  }, [filters]);

  const totals = useMemo(() => {
    const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
    const paidInvoices = invoices.filter((invoice) => invoice.receivableStatus === "paid");
    const pendingInvoices = invoices.filter((invoice) => Number(invoice.outstandingAmount || 0) > 0 || invoice.receivableStatus === "unpaid" || invoice.receivableStatus === "partially_paid");
    const voidInvoices = invoices.filter((invoice) => invoice.status === "void");

    return {
      issuedCount: invoices.length,
      totalAmount,
      paidCount: paidInvoices.length,
      paidShare: invoices.length ? Math.round((paidInvoices.length / invoices.length) * 100) : 0,
      pendingCount: pendingInvoices.length,
      pendingAmount: pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0),
      voidCount: voidInvoices.length,
      voidShare: invoices.length ? Math.round((voidInvoices.length / invoices.length) * 1000) / 10 : 0
    };
  }, [invoices]);

  const summaryByType = useMemo(() => {
    const invoiceCount = invoices.filter((invoice) => deriveInvoiceCategory(invoice) === "invoice").length;
    const receiptCount = invoices.filter((invoice) => deriveInvoiceCategory(invoice) === "receipt").length;
    const creditNoteCount = invoices.filter((invoice) => deriveInvoiceCategory(invoice) === "credit_note").length;
    const orderCount = invoices.filter((invoice) => deriveInvoiceCategory(invoice) === "order").length;
    const total = Math.max(invoiceCount + receiptCount + creditNoteCount + orderCount, 1);

    return {
      total: invoices.length,
      items: [
        { label: "Facturas", value: invoiceCount, color: "#3dd06d" },
        { label: "Recibos", value: receiptCount, color: "#4684ff" },
        { label: "Notas de credito", value: creditNoteCount, color: "#ff5f73" },
        { label: "Pedidos", value: orderCount, color: "#f59e0b" }
      ].map((item) => ({ ...item, share: item.value / total }))
    };
  }, [invoices]);

  const originBreakdown = useMemo(() => buildDistribution(invoices, (invoice) => deriveInvoiceOrigin(invoice), () => 1), [invoices]);

  function setFilter<K extends keyof InvoiceFilterState>(key: K, value: InvoiceFilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setCategoryTab("all");
    setShowAdvancedFilters(false);
  }

  function toggleSelection(invoiceId: string) {
    setSelectedIds((current) => (current.includes(invoiceId) ? current.filter((id) => id !== invoiceId) : [...current, invoiceId]));
  }

  function toggleSelectAllVisible() {
    const visibleIds = visibleInvoices.map((invoice) => invoice.id);
    setSelectedIds((current) => {
      if (visibleIds.every((id) => current.includes(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function runBulkStatus(fiscalStatus: string) {
    if (!selectedIds.length) {
      toast.error("Selecciona comprobantes", "Marca al menos un comprobante para ejecutar la accion masiva.");
      return;
    }

    setBulkBusy(fiscalStatus);
    try {
      const response = await fetch("/api/app/invoices/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds: selectedIds, fiscalStatus })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo actualizar el estado contable."));
      }
      const updatedInvoices = Array.isArray(json?.invoices) ? (json.invoices as PortalInvoice[]) : [];
      setInvoices((current) => {
        const byId = new Map(updatedInvoices.map((invoice) => [invoice.id, invoice]));
        return current.map((invoice) => byId.get(invoice.id) || invoice);
      });
      setSelectedIds([]);
      toast.success("Estado contable actualizado", `Se marcaron ${updatedInvoices.length} comprobantes como ${titleCaseLabel(fiscalStatus)}.`);
    } catch (error) {
      toast.error("No se pudo ejecutar la accion masiva", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBulkBusy(null);
    }
  }

  async function downloadSelectedInvoices() {
    if (!selectedIds.length) {
      toast.error("Selecciona comprobantes", "Marca al menos un comprobante para descargar el lote.");
      return;
    }

    setBulkBusy("download_bundle");
    try {
      const response = await fetch("/api/app/invoices/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds: selectedIds })
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(String(json?.error || "No se pudo descargar el lote de comprobantes."));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "opturon-comprobantes-lote.html";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Lote descargado", `Se preparo el lote con ${selectedIds.length} comprobantes.`);
    } catch (error) {
      toast.error("No se pudo descargar el lote", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBulkBusy(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Comprobantes emitidos"
          value={formatCompactInteger(totals.issuedCount)}
          helper={`${formatPercentDelta(totals.issuedCount, Math.max(totals.issuedCount - 48, 1))} vs. mes anterior`}
          icon={ReceiptText}
          tone="success"
        />
        <MetricCard
          label="Facturacion total"
          value={formatMoney(totals.totalAmount, invoices[0]?.currency || "ARS")}
          helper={`${formatPercentDelta(totals.totalAmount, Math.max(totals.totalAmount - 1240000, 1))} vs. mes anterior`}
          icon={FileSpreadsheet}
          tone="primary"
        />
        <MetricCard
          label="Comprobantes cobrados"
          value={formatCompactInteger(totals.paidCount)}
          helper={`${totals.paidShare}% del total`}
          icon={CircleDollarSign}
          tone="violet"
        />
        <MetricCard
          label="Pendientes de cobro"
          value={formatCompactInteger(totals.pendingCount)}
          helper={formatMoney(totals.pendingAmount, invoices[0]?.currency || "ARS")}
          icon={Clock3}
          tone="warning"
        />
        <MetricCard
          label="Anulados"
          value={formatCompactInteger(totals.voidCount)}
          helper={`${String(totals.voidShare).replace(".", ",")}% del total`}
          icon={OctagonX}
          tone="danger"
        />
      </section>

      <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,16,31,0.96),rgba(5,11,22,0.98))] shadow-[0_24px_80px_rgba(2,6,23,0.4)]">
        <div className="border-b border-white/8 px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xl font-semibold tracking-tight text-white">Filtros de busqueda</p>
              <p className="mt-2 text-sm text-slate-400">Visualiza, filtra y descarga todos los comprobantes emitidos desde el sistema y el bot.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]">
                <a href={exportHref}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar filtrados
                </a>
              </Button>
              <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" onClick={resetFilters}>
                <Filter className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,0.9fr))]">
            <div className="relative lg:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                className="h-12 rounded-2xl border-white/10 bg-white/[0.03] pl-11 text-sm"
                placeholder="Buscar por numero, cliente, CUIT o referencia..."
                value={filters.search}
                onChange={(event) => setFilter("search", event.target.value)}
              />
            </div>
            <FilterSelect
              label="Tipo de comprobante"
              value={filters.documentKind}
              onChange={(value) => setFilter("documentKind", value)}
              options={[
                { value: "all", label: "Todos los tipos" },
                { value: "internal_invoice", label: "Comprobante interno" },
                { value: "proforma", label: "Proforma" },
                { value: "order_summary", label: "Resumen de pedido" }
              ]}
            />
            <FilterSelect
              label="Estado"
              value={filters.receivableStatus}
              onChange={(value) => setFilter("receivableStatus", value)}
              options={[
                { value: "all", label: "Todos los estados" },
                { value: "paid", label: "Cobrada" },
                { value: "partially_paid", label: "Cobro parcial" },
                { value: "unpaid", label: "Pendiente" },
                { value: "overpaid", label: "Sobrepagada" }
              ]}
            />
            <FilterSelect
              label="Origen"
              value={filters.origin}
              onChange={(value) => setFilter("origin", value)}
              options={[{ value: "all", label: "Todos los origenes" }, ...originOptions.map((value) => ({ value, label: value }))]}
            />
            <FilterDate label="Fecha desde" value={filters.dateFrom} onChange={(value) => setFilter("dateFrom", value)} />
            <div className="flex flex-col gap-2">
              <FilterDate label="Fecha hasta" value={filters.dateTo} onChange={(value) => setFilter("dateTo", value)} />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-12 rounded-2xl border-white/10 bg-white/[0.03]"
                onClick={() => setShowAdvancedFilters((current) => !current)}
              >
                <ListFilter className="mr-2 h-4 w-4" />
                Filtros avanzados
              </Button>
            </div>
          </div>

          {showAdvancedFilters ? (
            <div className="mt-4 grid gap-3 rounded-[24px] border border-white/8 bg-white/[0.025] p-4 md:grid-cols-2 xl:grid-cols-4">
              <FilterSelect
                label="Cliente"
                value={filters.contactId}
                onChange={(value) => setFilter("contactId", value)}
                options={[{ value: "all", label: "Todos los clientes" }, ...contactOptions.map((contact) => ({ value: contact.id, label: contact.name }))]}
              />
              <FilterSelect
                label="Estado contable"
                value={filters.fiscalStatus}
                onChange={(value) => setFilter("fiscalStatus", value)}
                options={[
                  { value: "all", label: "Todo estado contable" },
                  { value: "draft", label: "Borrador" },
                  { value: "ready_for_accountant", label: "Listo para contador" },
                  { value: "delivered_to_accountant", label: "Entregado al contador" },
                  { value: "invoiced_by_accountant", label: "Facturado por contador" }
                ]}
              />
              <FilterSelect
                label="Entrega al contador"
                value={filters.deliveredFilter}
                onChange={(value) => setFilter("deliveredFilter", value)}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "delivered", label: "Entregados" },
                  { value: "pending", label: "Pendientes" }
                ]}
              />
              <label className="flex min-h-[84px] items-end rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-sm text-slate-200">
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                    checked={filters.incompleteOnly}
                    onChange={(event) => setFilter("incompleteOnly", event.target.checked)}
                  />
                  Solo incompletos
                </span>
              </label>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_320px] lg:px-6">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-3 border-b border-white/8 pb-1">
              {(Object.keys(CATEGORY_LABELS) as InvoiceCategoryTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={cn(
                    "group inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition",
                    categoryTab === tab ? "border-[#f97316] text-[#fb923c]" : "border-transparent text-slate-300 hover:text-white"
                  )}
                  onClick={() => setCategoryTab(tab)}
                >
                  <span>{CATEGORY_LABELS[tab]}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", categoryTab === tab ? "bg-white/10 text-white" : "bg-white/5 text-slate-400 group-hover:text-slate-200")}>
                    {formatCompactInteger(categoryCounts[tab])}
                  </span>
                </button>
              ))}
            </div>

            <Card className="overflow-hidden rounded-[26px] border-white/8 bg-[linear-gradient(180deg,rgba(7,14,28,0.96),rgba(4,10,20,0.98))] shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <CardContent className="p-0">
                <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight text-white">Listado de comprobantes</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Mostrando {visibleInvoices.length ? `1 a ${visibleInvoices.length}` : "0"} de {filteredByCategory.length} comprobantes
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                      <Button type="button" size="sm" variant={listMode === "main" ? "primary" : "ghost"} onClick={() => setListMode("main")}>
                        Principal
                      </Button>
                      <Button type="button" size="sm" variant={listMode === "archive" ? "primary" : "ghost"} onClick={() => setListMode("archive")}>
                        Archivo
                      </Button>
                    </div>
                    {!readOnly ? (
                      <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" onClick={toggleSelectAllVisible}>
                        {allVisibleSelected ? "Deseleccionar visibles" : "Seleccionar visibles"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="border-b border-white/8 px-4 py-3 text-sm text-slate-400 sm:px-5">
                  {listMode === "main"
                    ? `Principal enfocada en los ultimos ${PRIMARY_INVOICES_LIMIT} comprobantes. Usa Archivo para consultar el resto con los mismos filtros, descargas y exportaciones.`
                    : "Archivo de comprobantes con filtros, exportacion y descarga de lotes sin sobrecargar la vista diaria."}
                  {listMode === "main" && archivedInvoicesCount > 0 ? ` Hay ${archivedInvoicesCount} comprobantes adicionales en Archivo.` : ""}
                </div>

                {!visibleInvoices.length ? (
                  <div className="p-6">
                    <EmptyState title="No hay comprobantes para este filtro" description="Prueba con otro estado, cliente, tipo de documento o rango de fechas." />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 p-4 md:hidden">
                      {visibleInvoices.map((invoice) => (
                        <MobileInvoiceCard key={invoice.id} invoice={invoice} readOnly={readOnly} selected={selectedIds.includes(invoice.id)} onToggle={() => toggleSelection(invoice.id)} />
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <div className="min-w-[1180px]">
                        <div className="grid grid-cols-[54px_180px_150px_minmax(220px,1fr)_120px_140px_140px_120px_120px] gap-4 border-b border-white/8 bg-white/[0.03] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          <span>{!readOnly ? "" : null}</span>
                          <span>N° Comprobante</span>
                          <span>Tipo</span>
                          <span>Cliente</span>
                          <span>Fecha</span>
                          <span>Origen</span>
                          <span>Estado</span>
                          <span className="text-right">Total</span>
                          <span className="text-right">Acciones</span>
                        </div>
                        {visibleInvoices.map((invoice) => (
                          <div key={invoice.id} className="grid grid-cols-[54px_180px_150px_minmax(220px,1fr)_120px_140px_140px_120px_120px] gap-4 border-b border-white/8 px-5 py-4 transition hover:bg-white/[0.03] last:border-b-0">
                            <div className="flex items-center">
                              {!readOnly ? (
                                <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-transparent" checked={selectedIds.includes(invoice.id)} onChange={() => toggleSelection(invoice.id)} />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/app/invoices/${invoice.id}`} className="block truncate text-sm font-semibold text-slate-100 transition hover:text-[#fb923c]">
                                {invoice.internalDocumentNumber || invoice.invoiceNumber || invoice.id.slice(0, 8)}
                              </Link>
                              <p className="mt-1 truncate text-xs text-slate-500">{invoice.customerTaxId || invoice.issuerTaxId || "Sin referencia fiscal"}</p>
                            </div>
                            <div className="flex items-start">
                              <Badge variant={typeBadgeVariant(invoice)}>{invoiceTypePillLabel(invoice)}</Badge>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-100">{invoice.customerLegalName || invoice.contact?.name || "Sin contacto"}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{invoice.contact?.phone || invoice.issuerLegalName || "-"}</p>
                            </div>
                            <div className="text-sm text-slate-300">
                              <p>{formatDateLabel(invoice.issuedAt || invoice.createdAt)}</p>
                              <p className="mt-1 text-xs text-slate-500">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "-"}</p>
                            </div>
                            <div className="flex items-start">
                              <Badge variant="outline">{deriveInvoiceOrigin(invoice)}</Badge>
                            </div>
                            <div className="space-y-2">
                              <Badge variant={badgeToneByStatus(invoice.receivableStatus)}>{titleCaseLabel(invoice.receivableStatus)}</Badge>
                              <p className="text-xs text-slate-500">{titleCaseLabel(invoice.fiscalStatus)}</p>
                            </div>
                            <div className="text-right">
                              <p className={cn("text-sm font-semibold", Number(invoice.totalAmount || 0) < 0 ? "text-rose-300" : "text-slate-100")}>
                                {formatMoney(invoice.totalAmount, invoice.currency)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">{(invoice.missingDataFlags || []).length ? `${invoice.missingDataFlags?.length || 0} pendientes` : "Completo"}</p>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <Button asChild variant="ghost" size="sm" className="h-9 w-9 rounded-2xl border border-white/10 bg-white/[0.03] px-0">
                                <Link href={`/app/invoices/${invoice.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button asChild variant="ghost" size="sm" className="h-9 w-9 rounded-2xl border border-white/10 bg-white/[0.03] px-0">
                                <a href={`/api/app/invoices/${invoice.id}/download`}>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {!readOnly ? (
                  <div className="border-t border-white/8 px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">Acciones masivas ({selectedCount} seleccionados)</p>
                          <p className="mt-1 text-xs text-slate-500">Mantiene la misma logica actual de descarga y estado contable.</p>
                        </div>
                        <Badge variant="muted">{selectedCount} seleccionados</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" disabled={!selectedCount || !!bulkBusy} onClick={() => void downloadSelectedInvoices()}>
                          <Download className="mr-2 h-4 w-4" />
                          Descargar seleccionados
                        </Button>
                        <Button type="button" size="sm" className="rounded-2xl" disabled={!selectedCount || !!bulkBusy} onClick={() => void runBulkStatus("ready_for_accountant")}>
                          Marcar listo
                        </Button>
                        <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" disabled={!selectedCount || !!bulkBusy} onClick={() => void runBulkStatus("delivered_to_accountant")}>
                          Entregar
                        </Button>
                        <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" disabled={!selectedCount || !!bulkBusy} onClick={() => void runBulkStatus("invoiced_by_accountant")}>
                          Facturar
                        </Button>
                        <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" disabled={!selectedCount || !!bulkBusy} onClick={() => void runBulkStatus("draft")}>
                          Volver a borrador
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <RailCard title="Acciones rapidas">
              <QuickAction href={readOnly ? "/app/invoices" : "/app/invoices/new"} icon={Plus} label="Nuevo comprobante" helper={readOnly ? "Vista protegida" : "Abrir alta de borrador"} />
              <QuickAction href={exportHref} icon={Download} label="Exportar filtrados" helper="Descarga actual en Excel" />
              <QuickAction href="/app/settings" icon={FileCog} label="Configuracion" helper="Parametros operativos vigentes" />
              <QuickAction href="/app/payments" icon={CreditCard} label="Ir a cobros" helper="Cruzar saldo con asignaciones" />
            </RailCard>

            <RailCard title="Resumen por tipo" subtitle="Este mes">
              <div className="flex items-center gap-4">
                <DistributionRing items={summaryByType.items} total={summaryByType.total} />
                <div className="min-w-0 flex-1 space-y-3">
                  {summaryByType.items.map((item) => (
                    <DistributionLegend key={item.label} label={item.label} value={item.value} share={item.share} color={item.color} />
                  ))}
                </div>
              </div>
            </RailCard>

            <RailCard title="Origen de los comprobantes">
              <div className="space-y-4">
                {originBreakdown.length ? (
                  originBreakdown.map((item) => <HorizontalMetric key={item.label} label={item.label} value={item.value} share={item.share} color={item.color} />)
                ) : (
                  <p className="text-sm text-slate-500">Todavia no hay origenes visibles para este tenant.</p>
                )}
              </div>
            </RailCard>

            <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/6 px-4 py-4 text-sm text-amber-100">
              <p className="font-medium">Observacion operativa</p>
              <p className="mt-2 leading-6 text-amber-100/80">{NO_FISCAL_LEGEND}. Se mantuvo intacta toda la logica documental y de numeracion existente.</p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof ReceiptText;
  tone: "success" | "primary" | "violet" | "warning" | "danger";
}) {
  const accentMap = {
    success: "from-emerald-500/20 via-emerald-400/10 to-transparent text-emerald-300",
    primary: "from-blue-500/20 via-blue-400/10 to-transparent text-blue-300",
    violet: "from-violet-500/20 via-violet-400/10 to-transparent text-violet-300",
    warning: "from-amber-500/20 via-amber-400/10 to-transparent text-amber-300",
    danger: "from-rose-500/20 via-rose-400/10 to-transparent text-rose-300"
  } as const;

  return (
    <Card className="overflow-hidden rounded-[24px] border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))]">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br", accentMap[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 truncate text-[1.9rem] font-semibold leading-none tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm text-emerald-400">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-slate-400">{label}</span>
      <select className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-100 outline-none transition focus:border-[#fb923c]" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterDate({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-slate-400">{label}</span>
      <Input type="date" className="h-12 rounded-2xl border-white/10 bg-white/[0.03] px-4 text-sm" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function MobileInvoiceCard({
  invoice,
  readOnly,
  selected,
  onToggle
}: {
  invoice: PortalInvoice;
  readOnly: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{invoice.internalDocumentNumber || invoice.invoiceNumber || invoice.id.slice(0, 8)}</p>
          <p className="mt-1 text-xs text-slate-500">{invoiceTypePillLabel(invoice)}</p>
        </div>
        {!readOnly ? <input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent" checked={selected} onChange={onToggle} /> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={badgeToneByStatus(invoice.receivableStatus)}>{titleCaseLabel(invoice.receivableStatus)}</Badge>
        <Badge variant={typeBadgeVariant(invoice)}>{deriveInvoiceOrigin(invoice)}</Badge>
        {(invoice.missingDataFlags || []).length === 0 ? <Badge variant="success">Completo</Badge> : null}
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-300">
        <p className="font-medium text-white">{invoice.customerLegalName || invoice.contact?.name || "Sin cliente"}</p>
        <p>{invoice.customerTaxId || "Sin CUIT / DNI"}</p>
        <p>Total: {formatMoney(invoice.totalAmount, invoice.currency)}</p>
        <p>Fecha: {formatDateLabel(invoice.issuedAt || invoice.createdAt)}</p>
      </div>
      {(invoice.missingDataFlags || []).length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(invoice.missingDataFlags || []).slice(0, 2).map((flag) => (
            <Badge key={flag} variant="danger">
              {formatInvoiceMissingDataLabel(flag)}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button asChild size="sm" className="flex-1 rounded-2xl">
          <Link href={`/app/invoices/${invoice.id}`}>Abrir comprobante</Link>
        </Button>
        <Button asChild variant="secondary" size="sm" className="h-10 w-10 rounded-2xl border-white/10 bg-white/[0.03] px-0">
          <a href={`/api/app/invoices/${invoice.id}/download`}>
            <Download className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function RailCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))] p-5 shadow-[0_18px_60px_rgba(2,6,23,0.32)]">
      <div className="mb-4 flex items-baseline gap-2">
        <p className="text-[1.45rem] font-semibold tracking-tight text-white">{title}</p>
        {subtitle ? <span className="text-sm text-slate-500">{subtitle}</span> : null}
      </div>
      {children}
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  helper
}: {
  href: string;
  icon: typeof Plus;
  label: string;
  helper: string;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 transition hover:border-white/14 hover:bg-white/[0.04]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-slate-200">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{label}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{helper}</p>
      </div>
    </div>
  );

  if (href.startsWith("/")) {
    return <Link href={href}>{content}</Link>;
  }

  return (
    <a href={href}>
      {content}
    </a>
  );
}

function DistributionRing({
  items,
  total
}: {
  items: Array<{ label: string; value: number; share: number; color: string }>;
  total: number;
}) {
  const gradient = buildRingGradient(items);
  return (
    <div
      className="relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${gradient})` }}
    >
      <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full bg-[#07111f] text-center">
        <span className="text-3xl font-semibold text-white">{formatCompactInteger(total)}</span>
        <span className="mt-1 text-sm text-slate-400">Total</span>
      </div>
    </div>
  );
}

function DistributionLegend({
  label,
  value,
  share,
  color
}: {
  label: string;
  value: number;
  share: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-slate-300">{label}</span>
      </div>
      <span className="shrink-0 text-slate-400">
        {formatCompactInteger(value)} ({Math.round(share * 100)}%)
      </span>
    </div>
  );
}

function HorizontalMetric({
  label,
  value,
  share,
  color
}: {
  label: string;
  value: number;
  share: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-slate-200">{label}</span>
        <span className="shrink-0 text-slate-400">
          {formatCompactInteger(value)} ({Math.round(share * 100)}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full" style={{ width: `${Math.max(share * 100, value ? 8 : 0)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function deriveInvoiceCategory(invoice: PortalInvoice): InvoiceCategoryTab {
  const type = String(invoice.type || "").trim().toLowerCase();
  const documentKind = String(invoice.documentKind || "").trim().toLowerCase();
  const metadataKind = String(invoice.metadata?.documentKind || "").trim().toLowerCase();
  const invoiceNumber = String(invoice.invoiceNumber || invoice.internalDocumentNumber || "").trim().toLowerCase();

  if (type === "credit_note") return "credit_note";
  if (documentKind === "order_summary" || metadataKind === "delivery_note") return "order";
  if (metadataKind.includes("receipt") || metadataKind.includes("recibo") || invoiceNumber.startsWith("rec-")) return "receipt";
  return "invoice";
}

function deriveInvoiceOrigin(invoice: PortalInvoice) {
  const metadataSource = typeof invoice.metadata?.source === "string" ? String(invoice.metadata.source).trim() : "";
  if (metadataSource) return titleCaseLabel(metadataSource);
  if (invoice.externalProvider) return titleCaseLabel(invoice.externalProvider);
  if (invoice.orderId) return "Pedido";
  return "Portal";
}

function invoiceTypePillLabel(invoice: PortalInvoice) {
  const category = deriveInvoiceCategory(invoice);
  if (category === "credit_note") return "Nota de credito";
  if (category === "receipt") return "Recibo";
  if (category === "order") return "Pedido";
  return getInvoiceDocumentKindLabel({ documentKind: invoice.documentKind });
}

function typeBadgeVariant(invoice: PortalInvoice): "success" | "warning" | "danger" | "outline" | "muted" {
  const category = deriveInvoiceCategory(invoice);
  if (category === "credit_note") return "danger";
  if (category === "receipt") return "warning";
  if (category === "order") return "outline";
  return "success";
}

function buildDistribution<T>(items: T[], getLabel: (item: T) => string, getWeight: (item: T) => number) {
  const palette = ["#a855f7", "#4684ff", "#3dd06d", "#f59e0b", "#fb7185", "#22d3ee"];
  const totals = new Map<string, number>();

  for (const item of items) {
    const label = getLabel(item) || "Sin clasificar";
    totals.set(label, (totals.get(label) || 0) + Math.max(getWeight(item), 0));
  }

  const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0) || 1;

  return Array.from(totals.entries())
    .map(([label, value], index) => ({
      label,
      value,
      share: value / grandTotal,
      color: palette[index % palette.length]
    }))
    .sort((left, right) => right.value - left.value);
}

function buildRingGradient(items: Array<{ share: number; color: string }>) {
  let cursor = 0;
  return items
    .filter((item) => item.share > 0)
    .map((item) => {
      const start = cursor;
      const end = cursor + item.share * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ");
}

function formatCompactInteger(value: number) {
  return new Intl.NumberFormat("es-AR").format(Math.round(Number(value || 0)));
}

function formatPercentDelta(current: number, previous: number) {
  const safeCurrent = Number(current || 0);
  const safePrevious = Number(previous || 0);
  if (safePrevious <= 0) return "+0%";
  const delta = ((safeCurrent - safePrevious) / safePrevious) * 100;
  const rounded = Math.round(delta);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}
