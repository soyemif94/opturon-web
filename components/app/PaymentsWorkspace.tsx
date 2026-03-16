"use client";

import { type FormEvent, useMemo, useState } from "react";
import { CreditCard, Loader2, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalInvoice, PortalPayment } from "@/lib/api";
import { badgeToneByStatus, formatDateLabel, formatMoney, titleCaseLabel } from "@/lib/billing";

type PaymentDraft = {
  amount: string;
  method: string;
  paidAt: string;
  invoiceId: string;
  notes: string;
};

const EMPTY_DRAFT: PaymentDraft = {
  amount: "",
  method: "bank_transfer",
  paidAt: new Date().toISOString().slice(0, 16),
  invoiceId: "",
  notes: ""
};

type PaymentFilterState = {
  search: string;
  status: string;
  method: string;
  contactId: string;
};

const EMPTY_FILTERS: PaymentFilterState = {
  search: "",
  status: "all",
  method: "all",
  contactId: "all"
};

export function PaymentsWorkspace({
  initialPayments,
  initialInvoices,
  readOnly = false
}: {
  initialPayments: PortalPayment[];
  initialInvoices: PortalInvoice[];
  readOnly?: boolean;
}) {
  const [payments, setPayments] = useState(Array.isArray(initialPayments) ? initialPayments : []);
  const [invoices, setInvoices] = useState(Array.isArray(initialInvoices) ? initialInvoices : []);
  const [draft, setDraft] = useState<PaymentDraft>(EMPTY_DRAFT);
  const [filters, setFilters] = useState<PaymentFilterState>(EMPTY_FILTERS);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  function normalizeSearchValue(value: unknown) {
    return String(value ?? "").trim().toLowerCase();
  }

  const payableInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.status === "issued" && invoice.type === "invoice" && Number(invoice.outstandingAmount || 0) > 0
      ),
    [invoices]
  );

  const contactOptions = useMemo(() => {
    const seen = new Map<string, string>();
    payments.forEach((payment) => {
      if (payment.contact?.id && payment.contact?.name && !seen.has(payment.contact.id)) {
        seen.set(payment.contact.id, payment.contact.name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const search = normalizeSearchValue(filters.search);
    return payments.filter((payment) => {
      if (filters.status !== "all" && payment.status !== filters.status) return false;
      if (filters.method !== "all" && payment.method !== filters.method) return false;
      if (filters.contactId !== "all" && payment.contact?.id !== filters.contactId) return false;

      if (!search) return true;
      const haystack = [
        payment.id,
        payment.status,
        payment.method,
        payment.externalReference,
        payment.contact?.name,
        payment.contact?.phone,
        payment.invoiceId,
        payment.allocations?.map((allocation) => allocation.invoice?.invoiceNumber || allocation.invoiceId).join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [filters, payments]);

  async function refreshWorkspace() {
    const [paymentsResponse, invoicesResponse] = await Promise.all([
      fetch("/api/app/payments", { cache: "no-store" }),
      fetch("/api/app/invoices", { cache: "no-store" })
    ]);
    const paymentsJson = await paymentsResponse.json().catch(() => null);
    const invoicesJson = await invoicesResponse.json().catch(() => null);

    if (!paymentsResponse.ok) {
      throw new Error(String(paymentsJson?.error || "No se pudieron refrescar los cobros."));
    }
    if (!invoicesResponse.ok) {
      throw new Error(String(invoicesJson?.error || "No se pudieron refrescar las facturas."));
    }

    setPayments(Array.isArray(paymentsJson?.payments) ? paymentsJson.payments : []);
    setInvoices(Array.isArray(invoicesJson?.invoices) ? invoicesJson.invoices : []);
  }

  async function createPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    const amount = Number(draft.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Monto invalido", "Ingresa un importe valido para registrar el cobro.");
      return;
    }

    const selectedInvoice = payableInvoices.find((invoice) => invoice.id === draft.invoiceId) || null;

    setBusyAction("create_payment");
    try {
      const response = await fetch("/api/app/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: draft.method,
          paidAt: draft.paidAt ? new Date(draft.paidAt).toISOString() : undefined,
          invoiceId: selectedInvoice?.id || null,
          contactId: selectedInvoice?.contactId || null,
          notes: draft.notes.trim() || null,
          currency: selectedInvoice?.currency || "ARS"
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo registrar el cobro."));
      }

      await refreshWorkspace();
      setDraft(EMPTY_DRAFT);
      toast.success("Cobro registrado", "La cobranza ya esta visible en el modulo de facturacion.");
    } catch (error) {
      toast.error("No se pudo registrar el cobro", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  async function voidPayment(paymentId: string) {
    setBusyAction(paymentId);
    try {
      const response = await fetch(`/api/app/payments/${paymentId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo anular el cobro."));
      }

      await refreshWorkspace();
      toast.success("Cobro anulado");
    } catch (error) {
      toast.error("No se pudo anular el cobro", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="muted">{filteredPayments.length} visibles</Badge>}>
          <div>
          <CardTitle className="text-xl">Listado de cobros</CardTitle>
          <CardDescription>Filtros cortos para seguir cobranza, saldo libre y anulaciones sin sumar complejidad de backoffice.</CardDescription>
        </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_180px_180px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-10"
                placeholder="Buscar por contacto, referencia o factura"
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
              <option value="recorded">Registrado</option>
              <option value="void">Anulado</option>
            </select>
            <select
              className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
              value={filters.method}
              onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value }))}
            >
              <option value="all">Todos los metodos</option>
              <option value="bank_transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
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

          {!payments.length ? (
            <EmptyState
              title="Todavia no hay cobros visibles"
              description="Cuando registres cobros apareceran aqui con su estado y distribucion."
            />
          ) : !filteredPayments.length ? (
            <EmptyState
              title="No hay cobros para este filtro"
              description="Prueba con otro estado, metodo o contacto para volver a ver cobranzas."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
              <div className="grid grid-cols-[140px_140px_120px_minmax(0,1fr)_220px_140px_120px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                <span>Monto</span>
                <span>Metodo</span>
                <span>Estado</span>
                <span>Contacto</span>
                <span>Factura / asignacion</span>
                <span>Fecha</span>
                <span>Accion</span>
              </div>
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="grid grid-cols-[140px_140px_120px_minmax(0,1fr)_220px_140px_120px] gap-4 border-b border-[color:var(--border)] px-4 py-4 last:border-b-0">
                  <PaymentAmountStack payment={payment} />
                  <div className="flex items-center text-sm text-muted">{titleCaseLabel(payment.method)}</div>
                  <div className="flex items-center">
                    <Badge variant={badgeToneByStatus(payment.status)}>{titleCaseLabel(payment.status)}</Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{payment.contact?.name || "Sin contacto"}</p>
                    <p className="mt-1 truncate text-sm text-muted">{payment.contact?.phone || payment.externalReference || "-"}</p>
                  </div>
                  <div className="min-w-0 text-sm text-muted">
                    {payment.allocations?.length ? (
                      <>
                        <p>{payment.allocations.length} asignacion(es)</p>
                        <p className="mt-1 truncate">
                          {payment.allocations
                            .slice(0, 2)
                            .map((allocation) => allocation.invoice?.invoiceNumber || allocation.invoiceId.slice(0, 8))
                            .join(" - ")}
                        </p>
                      </>
                    ) : (
                      <p>{payment.invoiceId ? `Factura ${payment.invoiceId.slice(0, 8)}` : "Pago a cuenta / sin asignar"}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted">{formatDateLabel(payment.paidAt || payment.createdAt)}</div>
                  <div className="flex items-center">
                    {!readOnly && payment.lifecycle?.canVoid ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-2xl"
                        onClick={() => void voidPayment(payment.id)}
                        disabled={busyAction !== null}
                      >
                        {busyAction === payment.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                        Anular
                      </Button>
                    ) : (
                      <Badge variant="muted">Sin accion</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/6 bg-card/90">
        <CardHeader action={readOnly ? <Badge variant="muted">Solo lectura</Badge> : <Badge variant="warning">Registrar</Badge>}>
          <div>
            <CardTitle className="text-xl">Registrar cobro</CardTitle>
            <CardDescription>Carga minima para cobrar una factura o dejar un pago a cuenta visible.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <form className="space-y-3" onSubmit={createPayment}>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto"
              value={draft.amount}
              onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
              disabled={readOnly || busyAction !== null}
            />
            <select
              className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
              value={draft.method}
              onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}
              disabled={readOnly || busyAction !== null}
            >
              <option value="bank_transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
            <Input
              type="datetime-local"
              value={draft.paidAt}
              onChange={(event) => setDraft((current) => ({ ...current, paidAt: event.target.value }))}
              disabled={readOnly || busyAction !== null}
            />
            <select
              className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
              value={draft.invoiceId}
              onChange={(event) => setDraft((current) => ({ ...current, invoiceId: event.target.value }))}
              disabled={readOnly || busyAction !== null}
            >
              <option value="">Sin factura especifica</option>
              {payableInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {(invoice.invoiceNumber || invoice.id.slice(0, 8))} - {formatMoney(invoice.outstandingAmount, invoice.currency)}
                </option>
              ))}
            </select>
            <Textarea
              rows={3}
              placeholder="Notas internas del cobro"
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              disabled={readOnly || busyAction !== null}
            />
            <Button type="submit" className="w-full rounded-2xl" disabled={readOnly || busyAction !== null}>
              {busyAction === "create_payment" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Registrar cobro
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentAmountStack({ payment }: { payment: PortalPayment }) {
  const allocatedAmount = Math.max(0, Number(payment.amount || 0) - Number(payment.unallocatedAmount || 0));

  return (
    <div className="min-w-0">
      <p className="font-medium">{formatMoney(payment.amount, payment.currency)}</p>
      <p className="mt-1 text-sm text-emerald-300">Asignado {formatMoney(allocatedAmount, payment.currency)}</p>
      <p className="mt-1 text-sm text-amber-300">Libre {formatMoney(payment.unallocatedAmount, payment.currency)}</p>
    </div>
  );
}
