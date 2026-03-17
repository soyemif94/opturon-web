"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  CreditCard,
  Landmark,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  Wallet
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalInvoice, PortalPayment } from "@/lib/api";
import {
  badgeToneByStatus,
  formatDateLabel,
  formatMoney,
  getPaymentDestinationLabel,
  normalizePaymentDestinationValue,
  normalizePaymentMethodValue,
  parseLocalizedMoneyInput,
  PAYMENT_DESTINATION_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  titleCaseLabel
} from "@/lib/billing";

type PaymentDraft = {
  amount: string;
  method: string;
  destinationAccount: string;
  paidAt: string;
  invoiceId: string;
  notes: string;
};

const EMPTY_DRAFT: PaymentDraft = {
  amount: "",
  method: "bank_transfer",
  destinationAccount: "other",
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

function normalizeSearchValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function coerceDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getTodayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekStart() {
  const date = getTodayStart();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date;
}

function getMonthStart() {
  const date = getTodayStart();
  date.setDate(1);
  return date;
}

function isOnOrAfter(value: string | null | undefined, boundary: Date) {
  const date = coerceDate(value);
  return Boolean(date && date.getTime() >= boundary.getTime());
}

function paymentDestinationValue(payment: PortalPayment) {
  const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : null;
  const candidate =
    typeof metadata?.destinationAccount === "string"
      ? metadata.destinationAccount
      : typeof metadata?.destination === "string"
        ? metadata.destination
        : payment.method === "cash"
          ? "cash_drawer"
          : "other";

  return normalizePaymentDestinationValue(candidate);
}

function paymentEffectiveDate(payment: PortalPayment) {
  return payment.paidAt || payment.createdAt;
}

function creditNoteEffectiveDate(invoice: PortalInvoice) {
  return invoice.issuedAt || invoice.createdAt;
}

function sumPayments(payments: PortalPayment[]) {
  return payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function sumCreditNotes(invoices: PortalInvoice[]) {
  return invoices.reduce((sum, invoice) => sum + Math.abs(Number(invoice.totalAmount || 0)), 0);
}

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

  const todayStart = useMemo(() => getTodayStart(), []);
  const weekStart = useMemo(() => getWeekStart(), []);
  const monthStart = useMemo(() => getMonthStart(), []);

  const recordedPayments = useMemo(
    () => payments.filter((payment) => payment.status === "recorded"),
    [payments]
  );

  const issuedCreditNotes = useMemo(
    () => invoices.filter((invoice) => invoice.type === "credit_note" && invoice.status === "issued"),
    [invoices]
  );

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
      if (filters.method !== "all" && normalizePaymentMethodValue(payment.method) !== filters.method) return false;
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
        getPaymentDestinationLabel(paymentDestinationValue(payment)),
        payment.allocations?.map((allocation) => allocation.invoice?.invoiceNumber || allocation.invoiceId).join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [filters, payments]);

  const financialSummary = useMemo(() => {
    const paymentsToday = recordedPayments.filter((payment) => isOnOrAfter(paymentEffectiveDate(payment), todayStart));
    const paymentsWeek = recordedPayments.filter((payment) => isOnOrAfter(paymentEffectiveDate(payment), weekStart));
    const paymentsMonth = recordedPayments.filter((payment) => isOnOrAfter(paymentEffectiveDate(payment), monthStart));

    const creditNotesToday = issuedCreditNotes.filter((invoice) => isOnOrAfter(creditNoteEffectiveDate(invoice), todayStart));
    const creditNotesWeek = issuedCreditNotes.filter((invoice) => isOnOrAfter(creditNoteEffectiveDate(invoice), weekStart));
    const creditNotesMonth = issuedCreditNotes.filter((invoice) => isOnOrAfter(creditNoteEffectiveDate(invoice), monthStart));

    const grossToday = sumPayments(paymentsToday);
    const creditToday = sumCreditNotes(creditNotesToday);
    const netToday = grossToday - creditToday;
    const netWeek = sumPayments(paymentsWeek) - sumCreditNotes(creditNotesWeek);
    const netMonth = sumPayments(paymentsMonth) - sumCreditNotes(creditNotesMonth);

    return {
      grossToday,
      creditToday,
      netToday,
      netWeek,
      netMonth
    };
  }, [issuedCreditNotes, monthStart, recordedPayments, todayStart, weekStart]);

  const destinationBreakdown = useMemo(() => {
    const totals = new Map<string, number>();

    recordedPayments
      .filter((payment) => isOnOrAfter(paymentEffectiveDate(payment), monthStart))
      .forEach((payment) => {
        const destination = paymentDestinationValue(payment);
        totals.set(destination, (totals.get(destination) || 0) + Number(payment.amount || 0));
      });

    return PAYMENT_DESTINATION_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
      totalAmount: totals.get(option.value) || 0
    })).filter((item) => item.totalAmount > 0);
  }, [monthStart, recordedPayments]);

  const recentCreditNotes = useMemo(
    () =>
      [...issuedCreditNotes]
        .sort((left, right) => {
          const leftDate = coerceDate(creditNoteEffectiveDate(left))?.getTime() || 0;
          const rightDate = coerceDate(creditNoteEffectiveDate(right))?.getTime() || 0;
          return rightDate - leftDate;
        })
        .slice(0, 8),
    [issuedCreditNotes]
  );

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

    const amount = parseLocalizedMoneyInput(draft.amount);
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
          currency: selectedInvoice?.currency || "ARS",
          metadata: {
            destinationAccount: normalizePaymentDestinationValue(draft.destinationAccount)
          }
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo registrar el cobro."));
      }

      await refreshWorkspace();
      setDraft(EMPTY_DRAFT);
      toast.success("Cobro registrado", "La lectura financiera ya refleja el ingreso y su destino.");
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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Ingreso bruto del dia"
          value={formatMoney(financialSummary.grossToday)}
          helper="Cobros registrados hoy"
          icon={<Wallet className="h-4 w-4" />}
        />
        <SummaryCard
          title="Notas de credito del dia"
          value={formatMoney(financialSummary.creditToday)}
          helper="Impacto emitido hoy"
          icon={<ArrowDownLeft className="h-4 w-4" />}
        />
        <SummaryCard
          title="Ingreso neto del dia"
          value={formatMoney(financialSummary.netToday)}
          helper="Cobros menos creditos"
          icon={<Landmark className="h-4 w-4" />}
        />
        <SummaryCard
          title="Ingreso neto de la semana"
          value={formatMoney(financialSummary.netWeek)}
          helper="Semana en curso"
          icon={<Landmark className="h-4 w-4" />}
        />
        <SummaryCard
          title="Ingreso neto del mes"
          value={formatMoney(financialSummary.netMonth)}
          helper="Mes en curso"
          icon={<ReceiptText className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Card className="border-white/6 bg-card/90">
              <CardHeader action={<Badge variant="muted">Mes actual</Badge>}>
                <div>
                  <CardTitle className="text-xl">Destino del dinero</CardTitle>
                  <CardDescription>Totales netos de cobros registrados por caja, banco o billetera.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {destinationBreakdown.length ? (
                  destinationBreakdown.map((destination) => (
                    <div
                      key={destination.value}
                      className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-surface/60 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{destination.label}</p>
                        <p className="text-sm text-muted">Ingresos registrados</p>
                      </div>
                      <p className="text-right font-semibold">{formatMoney(destination.totalAmount)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Todavia no hay destinos con movimientos"
                    description="Cuando registres cobros por cuenta o billetera, el desglose aparecera aqui."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-white/6 bg-card/90">
              <CardHeader action={<Badge variant="muted">{recentCreditNotes.length} visibles</Badge>}>
                <div>
                  <CardTitle className="text-xl">Notas de credito</CardTitle>
                  <CardDescription>Impacto financiero reciente para leer el neto real sin salir de cobros.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {recentCreditNotes.length ? (
                  recentCreditNotes.map((creditNote) => (
                    <div
                      key={creditNote.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {creditNote.invoiceNumber || `Nota ${creditNote.id.slice(0, 8)}`}
                        </p>
                        <p className="mt-1 truncate text-sm text-muted">
                          {creditNote.parentInvoice?.invoiceNumber
                            ? `Sobre ${creditNote.parentInvoice.invoiceNumber}`
                            : creditNote.contact?.name || "Sin factura origen visible"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-rose-300">-{formatMoney(Math.abs(creditNote.totalAmount), creditNote.currency)}</p>
                        <p className="mt-1 text-sm text-muted">{formatDateLabel(creditNoteEffectiveDate(creditNote))}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No hay notas de credito emitidas"
                    description="Cuando una devolucion impacte facturacion, vas a verla tambien desde esta pantalla."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="muted">{filteredPayments.length} visibles</Badge>}>
              <div>
                <CardTitle className="text-xl">Movimientos de cobro</CardTitle>
                <CardDescription>Lectura operativa de ingresos, saldo libre y destino del dinero sin sumar backoffice pesado.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_180px_180px_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    className="pl-10"
                    placeholder="Buscar por contacto, referencia, destino o factura"
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
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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
                  description="Cuando registres cobros apareceran aqui con su estado, saldo libre y destino."
                />
              ) : !filteredPayments.length ? (
                <EmptyState
                  title="No hay cobros para este filtro"
                  description="Prueba con otro estado, metodo o contacto para volver a ver cobranzas."
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)]">
                  <div className="min-w-[1280px]">
                    <div className="grid grid-cols-[150px_120px_150px_120px_minmax(220px,1fr)_minmax(240px,1.1fr)_120px_120px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                      <span className="leading-snug">Monto</span>
                      <span className="leading-snug">Metodo</span>
                      <span className="leading-snug">Destino</span>
                      <span className="leading-snug">Estado</span>
                      <span className="leading-snug">Contacto</span>
                      <span className="leading-snug">Factura / asignacion</span>
                      <span className="leading-snug">Fecha</span>
                      <span className="leading-snug">Accion</span>
                    </div>
                    {filteredPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="grid grid-cols-[150px_120px_150px_120px_minmax(220px,1fr)_minmax(240px,1.1fr)_120px_120px] gap-4 border-b border-[color:var(--border)] px-4 py-4 last:border-b-0"
                      >
                        <PaymentAmountStack payment={payment} />
                        <div className="flex items-center text-sm text-muted">{titleCaseLabel(payment.method)}</div>
                        <div className="flex items-center text-sm text-muted">{getPaymentDestinationLabel(paymentDestinationValue(payment))}</div>
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
                        <div className="text-sm text-muted">{formatDateLabel(paymentEffectiveDate(payment))}</div>
                        <div className="flex items-center">
                          {!readOnly && payment.lifecycle?.canVoid ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="rounded-2xl"
                              onClick={() => void voidPayment(payment.id)}
                              disabled={busyAction !== null}
                            >
                              {busyAction === payment.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="mr-2 h-4 w-4" />
                              )}
                              Anular
                            </Button>
                          ) : (
                            <Badge variant="muted">Sin accion</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-white/6 bg-card/90">
          <CardHeader action={readOnly ? <Badge variant="muted">Solo lectura</Badge> : <Badge variant="warning">Manual</Badge>}>
            <div>
              <CardTitle className="text-xl">Registrar cobro manual</CardTitle>
              <CardDescription>Carga rapida para caja o ajustes puntuales, sin dominar la lectura financiera.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <form className="space-y-3" onSubmit={createPayment}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">$</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="pl-8"
                  placeholder="25.000,50"
                  value={draft.amount}
                  onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                  disabled={readOnly || busyAction !== null}
                />
              </div>
              <select
                className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                value={draft.method}
                onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}
                disabled={readOnly || busyAction !== null}
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                value={draft.destinationAccount}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    destinationAccount: normalizePaymentDestinationValue(event.target.value)
                  }))
                }
                disabled={readOnly || busyAction !== null}
              >
                {PAYMENT_DESTINATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
                {busyAction === "create_payment" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Registrar cobro
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  helper,
  icon
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-muted">{helper}</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-surface/70 p-2 text-muted">{icon}</div>
      </CardContent>
    </Card>
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
