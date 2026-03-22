"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { PortalInvoice } from "@/lib/api";
import {
  badgeToneByStatus,
  formatDateLabel,
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
};

const EMPTY_FILTERS: InvoiceFilterState = {
  search: "",
  receivableStatus: "all",
  contactId: "all",
  fiscalStatus: "all",
  documentKind: "all",
  deliveredFilter: "all",
  incompleteOnly: false,
  dateFrom: "",
  dateTo: ""
};

const NO_FISCAL_LEGEND = "Documento interno no valido como factura fiscal";

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

  const contactOptions = useMemo(() => {
    const seen = new Map<string, string>();
    invoices.forEach((invoice) => {
      if (invoice.contact?.id && invoice.contact?.name && !seen.has(invoice.contact.id)) {
        seen.set(invoice.contact.id, invoice.contact.name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
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
        invoice.fiscalStatus
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [filters, invoices]);

  const allVisibleSelected = filteredInvoices.length > 0 && filteredInvoices.every((invoice) => selectedIds.includes(invoice.id));
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

  function toggleSelection(invoiceId: string) {
    setSelectedIds((current) => (current.includes(invoiceId) ? current.filter((id) => id !== invoiceId) : [...current, invoiceId]));
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredInvoices.map((invoice) => invoice.id);
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
        const byId = new Map(updatedInvoices.map((invoice: PortalInvoice) => [invoice.id, invoice]));
        return current.map((invoice): PortalInvoice => byId.get(invoice.id) || invoice);
      });
      setSelectedIds([]);
      toast.success("Estado contable actualizado", `Se marcaron ${updatedInvoices.length} comprobantes como ${titleCaseLabel(fiscalStatus)}.`);
    } catch (error) {
      toast.error("No se pudo ejecutar la accion masiva", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBulkBusy(null);
    }
  }

  return (
    <Card className="border-white/6 bg-card/90">
      <CardHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">{NO_FISCAL_LEGEND}</Badge>
            <Badge variant="muted">{filteredInvoices.length} visibles</Badge>
            <Button asChild variant="secondary" size="sm" className="rounded-2xl">
              <a href={exportHref}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </a>
            </Button>
            {!readOnly ? (
              <Button asChild size="sm" className="rounded-2xl">
                <Link href="/app/invoices/new">Nuevo borrador</Link>
              </Button>
            ) : null}
          </div>
        }
      >
        <div>
          <CardTitle className="text-xl">Listado de comprobantes internos</CardTitle>
          <CardDescription>Pre-facturacion contable con filtros, flags de faltantes y workflow masivo para preparar lotes del contador.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_180px_180px_180px_180px_140px_140px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-10" placeholder="Buscar por documento, cliente, CUIT o emisor" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          </div>
          <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" value={filters.fiscalStatus} onChange={(event) => setFilters((current) => ({ ...current, fiscalStatus: event.target.value }))}>
            <option value="all">Todo estado contable</option>
            <option value="draft">Borrador</option>
            <option value="ready_for_accountant">Listo para contador</option>
            <option value="delivered_to_accountant">Entregado al contador</option>
            <option value="invoiced_by_accountant">Facturado por contador</option>
          </select>
          <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" value={filters.documentKind} onChange={(event) => setFilters((current) => ({ ...current, documentKind: event.target.value }))}>
            <option value="all">Todo tipo</option>
            <option value="internal_invoice">Comprobante interno</option>
            <option value="proforma">Proforma</option>
            <option value="order_summary">Resumen de pedido</option>
          </select>
          <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" value={filters.contactId} onChange={(event) => setFilters((current) => ({ ...current, contactId: event.target.value }))}>
            <option value="all">Todos los clientes</option>
            {contactOptions.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" value={filters.deliveredFilter} onChange={(event) => setFilters((current) => ({ ...current, deliveredFilter: event.target.value }))}>
            <option value="all">Entrega al contador</option>
            <option value="delivered">Entregados</option>
            <option value="pending">No entregados</option>
          </select>
          <Input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
          <Input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/45 px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={filters.incompleteOnly} onChange={(event) => setFilters((current) => ({ ...current, incompleteOnly: event.target.checked }))} />
            Solo incompletos
          </label>
          {!readOnly ? (
            <>
              <Button type="button" variant="secondary" size="sm" className="rounded-2xl" onClick={toggleSelectAllVisible}>
                {allVisibleSelected ? "Deseleccionar visibles" : "Seleccionar visibles"}
              </Button>
              <Badge variant="muted">{selectedCount} seleccionados</Badge>
              <Button type="button" size="sm" className="rounded-2xl" disabled={!selectedCount || !!bulkBusy} onClick={() => void runBulkStatus("ready_for_accountant")}>
                Listo para contador
              </Button>
              <Button type="button" variant="secondary" size="sm" className="rounded-2xl" disabled={!selectedCount || !!bulkBusy} onClick={() => void runBulkStatus("delivered_to_accountant")}>
                Entregado
              </Button>
              <Button type="button" variant="secondary" size="sm" className="rounded-2xl" disabled={!selectedCount || !!bulkBusy} onClick={() => void runBulkStatus("invoiced_by_accountant")}>
                Facturado
              </Button>
              <Button type="button" variant="secondary" size="sm" className="rounded-2xl" disabled={!selectedCount || !!bulkBusy} onClick={() => void runBulkStatus("draft")}>
                Volver a borrador
              </Button>
            </>
          ) : null}
        </div>

        {!filteredInvoices.length ? (
          <EmptyState title="No hay comprobantes para este filtro" description="Prueba con otro estado contable, cliente, tipo de documento o flags de faltantes." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)]">
            <div className="min-w-[1900px]">
              <div className="grid grid-cols-[60px_160px_180px_minmax(260px,1.2fr)_150px_170px_180px_180px_220px] gap-5 border-b border-[color:var(--border)] bg-surface/70 px-5 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                <span></span>
                <span>Documento</span>
                <span>Estado contable</span>
                <span>Cliente / emisor</span>
                <span>Total</span>
                <span>Cobranza</span>
                <span>Flags</span>
                <span>Fechas</span>
                <span>Accion</span>
              </div>
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="grid grid-cols-[60px_160px_180px_minmax(260px,1.2fr)_150px_170px_180px_180px_220px] gap-5 border-b border-[color:var(--border)] px-5 py-4 transition-colors hover:bg-surface/35 last:border-b-0">
                  <div className="flex items-center">
                    {!readOnly ? <input type="checkbox" checked={selectedIds.includes(invoice.id)} onChange={() => toggleSelection(invoice.id)} /> : null}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{invoice.internalDocumentNumber || invoice.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted">{getInvoiceDocumentKindLabel({ documentKind: invoice.documentKind })}</p>
                  </div>
                  <div className="space-y-2">
                    <Badge variant={badgeToneByStatus(invoice.fiscalStatus)}>{titleCaseLabel(invoice.fiscalStatus)}</Badge>
                    {invoice.deliveredToAccountantAt ? <p className="text-xs text-muted">Entregado</p> : <p className="text-xs text-muted">No entregado</p>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{invoice.customerLegalName || invoice.contact?.name || "Sin cliente"}</p>
                    <p className="mt-1 truncate text-sm text-muted">{invoice.customerTaxId || "Sin CUIT/DNI"}</p>
                    <p className="mt-1 truncate text-xs text-muted">Emisor: {invoice.issuerLegalName || "Sin emisor"}</p>
                  </div>
                  <MoneyStack primary={formatMoney(invoice.totalAmount, invoice.currency)} secondary={invoice.pointOfSaleSuggested ? `PV ${invoice.pointOfSaleSuggested}` : "Sin punto de venta"} />
                  <div className="space-y-1">
                    <Badge variant={badgeToneByStatus(invoice.receivableStatus)}>{titleCaseLabel(invoice.receivableStatus)}</Badge>
                    <p className="text-xs text-muted">{formatMoney(invoice.paidAmount, invoice.currency)} cobrados</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(invoice.missingDataFlags || []).length ? (
                      (invoice.missingDataFlags || []).slice(0, 3).map((flag) => (
                        <Badge key={flag} variant="danger">{titleCaseLabel(flag.replace(/^missing_/, ""))}</Badge>
                      ))
                    ) : (
                      <Badge variant="success">Completo</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted">
                    <p>{formatDateLabel(invoice.issuedAt || invoice.createdAt)}</p>
                    <p className="mt-1 text-xs">Entregado: {formatDateLabel(invoice.deliveredToAccountantAt)}</p>
                    <p className="mt-1 text-xs">Facturado: {formatDateLabel(invoice.invoicedByAccountantAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                      <Link href={`/app/invoices/${invoice.id}`}>Ver detalle</Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                      <a href={`/api/app/invoices/${invoice.id}/download`}>Descargar JSON</a>
                    </Button>
                    <Button asChild size="sm" className="rounded-2xl">
                      <a href={`/api/app/invoices/${invoice.id}/download?format=document`}>Descargar documento</a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MoneyStack({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="min-w-0 pr-2">
      <p className="font-medium">{primary}</p>
      <p className="mt-1 truncate text-sm leading-snug text-muted">{secondary}</p>
    </div>
  );
}
