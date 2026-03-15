"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { PortalInvoice } from "@/lib/api";
import { badgeToneByStatus, formatDateLabel, formatMoney, titleCaseLabel } from "@/lib/billing";

type InvoiceFilterState = {
  search: string;
  status: string;
  receivableStatus: string;
  contactId: string;
};

const EMPTY_FILTERS: InvoiceFilterState = {
  search: "",
  status: "all",
  receivableStatus: "all",
  contactId: "all"
};

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

      if (!search) return true;
      const haystack = [
        invoice.invoiceNumber,
        invoice.id,
        invoice.contact?.name,
        invoice.contact?.phone,
        invoice.type,
        invoice.status,
        invoice.receivableStatus
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [filters, initialInvoices]);

  return (
    <Card className="border-white/6 bg-card/90">
      <CardHeader
        action={
          <div className="flex items-center gap-2">
            <Badge variant="muted">{filteredInvoices.length} visibles</Badge>
            {!readOnly ? (
              <Button asChild size="sm" className="rounded-2xl">
                <Link href="/app/invoices/new">Nuevo borrador</Link>
              </Button>
            ) : null}
          </div>
        }
      >
        <div>
          <CardTitle className="text-xl">Listado de facturas</CardTitle>
          <CardDescription>Filtros cortos para leer estado documental y cobranza sin convertir esto en un backoffice pesado.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_180px_200px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-10"
              placeholder="Buscar por numero, contacto o estado"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </div>
          <select
            className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="issued">Emitida</option>
            <option value="void">Anulada</option>
          </select>
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
          <select
            className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
            value={filters.contactId}
            onChange={(event) => setFilters((current) => ({ ...current, contactId: event.target.value }))}
          >
            <option value="all">Todos los contactos</option>
            {contactOptions.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </select>
        </div>

        {!filteredInvoices.length ? (
          <EmptyState
            title="No hay facturas para este filtro"
            description="Prueba con otro estado, cobranza o contacto para volver a ver documentos."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
            <div className="grid grid-cols-[120px_120px_minmax(0,1.2fr)_160px_180px_180px_150px_140px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
              <span>Tipo</span>
              <span>Estado</span>
              <span>Contacto</span>
              <span>Total</span>
              <span>Cobrado</span>
              <span>Pendiente</span>
              <span>Cobranza</span>
              <span>Fecha</span>
            </div>
            {filteredInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/app/invoices/${invoice.id}`}
                className="grid grid-cols-[120px_120px_minmax(0,1.2fr)_160px_180px_180px_150px_140px] gap-4 border-b border-[color:var(--border)] px-4 py-4 transition-colors hover:bg-surface/35 last:border-b-0"
              >
                <div className="flex items-center">
                  <Badge variant={badgeToneByStatus(invoice.type)}>{titleCaseLabel(invoice.type)}</Badge>
                </div>
                <div className="flex items-center">
                  <Badge variant={badgeToneByStatus(invoice.status)}>{titleCaseLabel(invoice.status)}</Badge>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{invoice.contact?.name || "Sin contacto"}</p>
                  <p className="mt-1 truncate text-sm text-muted">{invoice.invoiceNumber || invoice.id.slice(0, 8)}</p>
                </div>
                <MoneyStack primary={formatMoney(invoice.totalAmount, invoice.currency)} secondary={`Impacto ${formatMoney(invoice.balanceImpact?.amount, invoice.currency)}`} />
                <MoneyStack primary={formatMoney(invoice.paidAmount, invoice.currency)} secondary="Cobrado" positive />
                <MoneyStack primary={formatMoney(invoice.outstandingAmount, invoice.currency)} secondary="Pendiente" warning />
                <div className="flex items-center">
                  <Badge variant={badgeToneByStatus(invoice.receivableStatus)}>{titleCaseLabel(invoice.receivableStatus)}</Badge>
                </div>
                <div className="text-sm text-muted">{formatDateLabel(invoice.issuedAt || invoice.createdAt)}</div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MoneyStack({
  primary,
  secondary,
  positive = false,
  warning = false
}: {
  primary: string;
  secondary: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className={`font-medium ${positive ? "text-emerald-300" : warning ? "text-amber-300" : ""}`}>{primary}</p>
      <p className="mt-1 truncate text-sm text-muted">{secondary}</p>
    </div>
  );
}
