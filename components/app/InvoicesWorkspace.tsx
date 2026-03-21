"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
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
  status: string;
  receivableStatus: string;
  contactId: string;
  fiscalStatus: string;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTERS: InvoiceFilterState = {
  search: "",
  status: "all",
  receivableStatus: "all",
  contactId: "all",
  fiscalStatus: "all",
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

  const contactOptions = useMemo(() => {
    const seen = new Map<string, string>();
    initialInvoices.forEach((invoice) => {
      if (invoice.contact?.id && invoice.contact?.name && !seen.has(invoice.contact.id)) {
        seen.set(invoice.contact.id, invoice.contact.name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [initialInvoices]);

  const filteredInvoices = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return initialInvoices.filter((invoice) => {
      if (filters.status !== "all" && invoice.status !== filters.status) return false;
      if (filters.receivableStatus !== "all" && invoice.receivableStatus !== filters.receivableStatus) return false;
      if (filters.contactId !== "all" && invoice.contact?.id !== filters.contactId) return false;
      if (filters.fiscalStatus !== "all" && invoice.fiscalStatus !== filters.fiscalStatus) return false;

      const referenceDate = new Date(invoice.issuedAt || invoice.createdAt || 0);
      if (filters.dateFrom) {
        const from = new Date(`${filters.dateFrom}T00:00:00`);
        if (referenceDate < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(`${filters.dateTo}T23:59:59`);
        if (referenceDate > to) return false;
      }

      if (!search) return true;
      const haystack = [
        invoice.internalDocumentNumber,
        invoice.invoiceNumber,
        invoice.id,
        invoice.contact?.name,
        invoice.contact?.phone,
        invoice.customerLegalName,
        invoice.customerTaxId,
        invoice.type,
        invoice.status,
        invoice.receivableStatus,
        invoice.fiscalStatus
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [filters, initialInvoices]);

  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.contactId !== "all") params.set("contactId", filters.contactId);
    if (filters.fiscalStatus !== "all") params.set("fiscalStatus", filters.fiscalStatus);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    return `/api/app/invoices/export?${params.toString()}`;
  }, [filters]);

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
          <CardDescription>Filtra por estado contable, fecha y cliente para preparar lote de entrega al estudio contable.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_180px_180px_220px_160px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-10"
              placeholder="Buscar por numero, cliente, CUIT o estado"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </div>
          <select
            className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
            value={filters.fiscalStatus}
            onChange={(event) => setFilters((current) => ({ ...current, fiscalStatus: event.target.value }))}
          >
            <option value="all">Todo estado contable</option>
            <option value="draft">Borrador</option>
            <option value="ready_for_accountant">Listo para contador</option>
            <option value="delivered_to_accountant">Entregado al contador</option>
            <option value="invoiced_by_accountant">Facturado por contador</option>
          </select>
          <select
            className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
            value={filters.contactId}
            onChange={(event) => setFilters((current) => ({ ...current, contactId: event.target.value }))}
          >
            <option value="all">Todos los clientes</option>
            {contactOptions.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
          <Input type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
          <Input type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
          <select
            className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
            value={filters.receivableStatus}
            onChange={(event) => setFilters((current) => ({ ...current, receivableStatus: event.target.value }))}
          >
            <option value="all">Toda cobranza</option>
            <option value="unpaid">Sin cobrar</option>
            <option value="partially_paid">Cobro parcial</option>
            <option value="paid">Cobrada</option>
            <option value="overpaid">Sobrepagada</option>
            <option value="not_applicable">No aplica</option>
          </select>
        </div>

        {!filteredInvoices.length ? (
          <EmptyState
            title="No hay comprobantes para este filtro"
            description="Prueba con otro estado contable, rango de fechas o cliente para volver a ver documentos."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)]">
            <div className="min-w-[1700px]">
              <div className="grid grid-cols-[160px_180px_minmax(260px,1.35fr)_150px_170px_150px_150px_150px_220px] gap-5 border-b border-[color:var(--border)] bg-surface/70 px-5 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                <span>Documento</span>
                <span>Estado contable</span>
                <span>Cliente</span>
                <span>Total</span>
                <span>Cobranza</span>
                <span>Emitido</span>
                <span>Comprobante sug.</span>
                <span>Tipo</span>
                <span>Accion</span>
              </div>
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid grid-cols-[160px_180px_minmax(260px,1.35fr)_150px_170px_150px_150px_150px_220px] gap-5 border-b border-[color:var(--border)] px-5 py-4 transition-colors hover:bg-surface/35 last:border-b-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{invoice.internalDocumentNumber || invoice.invoiceNumber || invoice.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted">{getInvoiceDocumentKindLabel({ documentKind: invoice.documentKind || invoice.metadata?.documentKind })}</p>
                  </div>
                  <div className="flex items-center">
                    <Badge variant={badgeToneByStatus(invoice.fiscalStatus)}>{titleCaseLabel(invoice.fiscalStatus)}</Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{invoice.customerLegalName || invoice.contact?.name || "Sin cliente"}</p>
                    <p className="mt-1 truncate text-sm text-muted">{invoice.customerTaxId || invoice.contact?.phone || "Sin identificacion"}</p>
                  </div>
                  <MoneyStack primary={formatMoney(invoice.totalAmount, invoice.currency)} secondary="Total interno" />
                  <div className="space-y-1">
                    <Badge variant={badgeToneByStatus(invoice.receivableStatus)}>{titleCaseLabel(invoice.receivableStatus)}</Badge>
                    <p className="text-xs text-muted">{formatMoney(invoice.paidAmount, invoice.currency)} cobrados</p>
                  </div>
                  <div className="text-sm text-muted">{formatDateLabel(invoice.issuedAt || invoice.createdAt)}</div>
                  <div className="text-sm text-muted">{invoice.suggestedFiscalVoucherType || "NONE"}</div>
                  <div className="text-sm text-muted">{titleCaseLabel(invoice.type)}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                      <Link href={`/app/invoices/${invoice.id}`}>Ver detalle</Link>
                    </Button>
                    <Button asChild size="sm" className="rounded-2xl">
                      <a href={`/api/app/invoices/${invoice.id}/document`}>Descargar</a>
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

function MoneyStack({
  primary,
  secondary
}: {
  primary: string;
  secondary: string;
}) {
  return (
    <div className="min-w-0 pr-2">
      <p className="font-medium">{primary}</p>
      <p className="mt-1 truncate text-sm leading-snug text-muted">{secondary}</p>
    </div>
  );
}
