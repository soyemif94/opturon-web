"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, Landmark, Loader2, Pencil, Plus, ReceiptText, RotateCcw, Save, Search, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { PortalInvoice, PortalOrder, PortalPayment, PortalPaymentDestination, PortalPaymentDestinationType } from "@/lib/api";
import {
  badgeToneByStatus,
  formatDateLabel,
  formatMoney,
  getPaymentDestinationLabel,
  normalizePaymentMethodValue,
  PAYMENT_METHOD_OPTIONS,
  titleCaseLabel
} from "@/lib/billing";

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

type DestinationFormState = {
  name: string;
  type: PortalPaymentDestinationType;
};

const EMPTY_DESTINATION_FORM: DestinationFormState = {
  name: "",
  type: "wallet"
};

const DESTINATION_TYPE_OPTIONS: Array<{ value: PortalPaymentDestinationType; label: string }> = [
  { value: "wallet", label: "Billetera" },
  { value: "bank", label: "Banco" },
  { value: "cash_box", label: "Caja" },
  { value: "other", label: "Otro" }
];

const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";
const WEEKDAY_INDEX: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6
};

function normalizeSearchValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function coerceDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function getBusinessDateParts(date: Date, timeZone = BUSINESS_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value || "0");
  const month = Number(parts.find((part) => part.type === "month")?.value || "0");
  const day = Number(parts.find((part) => part.type === "day")?.value || "0");
  return { year, month, day };
}

function getBusinessDayNumber(value: string | null | undefined, timeZone = BUSINESS_TIME_ZONE) {
  const date = coerceDate(value);
  if (!date) return null;
  const { year, month, day } = getBusinessDateParts(date, timeZone);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function getTodayContext(timeZone = BUSINESS_TIME_ZONE) {
  const now = new Date();
  const dayNumber = getBusinessDayNumber(now.toISOString(), timeZone) || 0;
  const { year, month } = getBusinessDateParts(now, timeZone);
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  });
  const weekdayKey = weekdayFormatter.format(now).trim().toLowerCase().slice(0, 3);
  const weekdayIndex = WEEKDAY_INDEX[weekdayKey] ?? 0;

  return {
    todayDayNumber: dayNumber,
    weekStartDayNumber: dayNumber - weekdayIndex,
    monthKey: `${year}-${String(month).padStart(2, "0")}`
  };
}

function getBusinessMonthKey(value: string | null | undefined, timeZone = BUSINESS_TIME_ZONE) {
  const date = coerceDate(value);
  if (!date) return null;
  const { year, month } = getBusinessDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function isDayInRange(dayNumber: number | null, startDayNumber: number, endDayNumber: number) {
  return dayNumber !== null && dayNumber >= startDayNumber && dayNumber <= endDayNumber;
}

function paymentDestinationLabel(payment: PortalPayment) {
  const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : null;
  if (typeof metadata?.destinationName === "string" && metadata.destinationName.trim()) {
    return metadata.destinationName.trim();
  }

  if (typeof metadata?.destinationAccount === "string" && metadata.destinationAccount.trim()) {
    return getPaymentDestinationLabel(metadata.destinationAccount.trim());
  }

  if (typeof metadata?.destination === "string" && metadata.destination.trim()) {
    return getPaymentDestinationLabel(metadata.destination.trim());
  }

  if (payment.method === "cash") {
    return "Caja";
  }

  return "Sin clasificar";
}

function paymentEffectiveDate(payment: PortalPayment) {
  return payment.paidAt || payment.createdAt;
}

function invoiceEffectiveDate(invoice: PortalInvoice) {
  return invoice.issuedAt || invoice.createdAt;
}

function orderEffectiveDate(order: PortalOrder) {
  return order.createdAt;
}

function sumPayments(payments: PortalPayment[]) {
  return payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function sumInvoices(invoices: PortalInvoice[]) {
  return invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
}

function destinationTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "wallet":
      return "Billetera";
    case "bank":
      return "Banco";
    case "cash_box":
      return "Caja";
    case "other":
      return "Otro";
    default:
      return "Sin tipo";
  }
}

function orderDestinationName(order: PortalOrder) {
  return order.paymentDestination?.name || order.paymentDestinationNameSnapshot || null;
}

function orderDestinationType(order: PortalOrder) {
  return order.paymentDestination?.type || order.paymentDestinationTypeSnapshot || null;
}

function orderDestinationKey(order: PortalOrder) {
  return order.paymentDestination?.id || order.paymentDestinationId || orderDestinationName(order) || null;
}

function labelForOrderCustomer(order: PortalOrder) {
  if (order.customerType === "final_consumer") return "Consumidor final";
  return order.customerName || order.contact?.name || "Cliente sin nombre";
}

function labelForOrderSeller(order: PortalOrder) {
  if (order.source === "bot" && !order.seller?.name && !order.sellerNameSnapshot) return "Bot";
  return order.seller?.name || order.sellerNameSnapshot || "Sin asignar";
}

function labelForOrderDestination(order: PortalOrder) {
  const name = orderDestinationName(order);
  const type = orderDestinationType(order);
  if (!name) return "Sin destino";
  return `${name}${type ? ` · ${destinationTypeLabel(type)}` : ""}`;
}

export function PaymentsWorkspace({
  initialPayments,
  initialInvoices,
  initialOrders,
  initialPaymentDestinations,
  readOnly = false
}: {
  initialPayments: PortalPayment[];
  initialInvoices: PortalInvoice[];
  initialOrders: PortalOrder[];
  initialPaymentDestinations: PortalPaymentDestination[];
  readOnly?: boolean;
}) {
  const [payments, setPayments] = useState(Array.isArray(initialPayments) ? initialPayments : []);
  const [invoices, setInvoices] = useState(Array.isArray(initialInvoices) ? initialInvoices : []);
  const [orders, setOrders] = useState(Array.isArray(initialOrders) ? initialOrders : []);
  const [paymentDestinations, setPaymentDestinations] = useState(Array.isArray(initialPaymentDestinations) ? initialPaymentDestinations : []);
  const [filters, setFilters] = useState<PaymentFilterState>(EMPTY_FILTERS);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showInactiveDestinations, setShowInactiveDestinations] = useState(true);
  const [destinationForm, setDestinationForm] = useState<DestinationFormState>(EMPTY_DESTINATION_FORM);
  const [destinationBusy, setDestinationBusy] = useState<string | null>(null);
  const [editingDestinationId, setEditingDestinationId] = useState<string | null>(null);
  const [editingDestinationDraft, setEditingDestinationDraft] = useState<DestinationFormState>(EMPTY_DESTINATION_FORM);

  const timeContext = useMemo(() => getTodayContext(), []);

  const recordedPayments = useMemo(
    () => payments.filter((payment) => payment.status === "recorded"),
    [payments]
  );

  const issuedCreditNotes = useMemo(
    () => invoices.filter((invoice) => invoice.type === "credit_note" && invoice.status === "issued"),
    [invoices]
  );

  const issuedInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.type === "invoice" && invoice.status === "issued"),
    [invoices]
  );

  const activeOrdersWithDestination = useMemo(
    () => orders.filter((order) => order.orderStatus !== "cancelled" && Boolean(orderDestinationName(order))),
    [orders]
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
        paymentDestinationLabel(payment),
        payment.allocations?.map((allocation) => allocation.invoice?.invoiceNumber || allocation.invoiceId).join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [filters, payments]);

  const financialSummary = useMemo(() => {
    const paymentsToday = recordedPayments.filter((payment) =>
      isDayInRange(
        getBusinessDayNumber(paymentEffectiveDate(payment)),
        timeContext.todayDayNumber,
        timeContext.todayDayNumber
      )
    );
    const paymentsWeek = recordedPayments.filter((payment) =>
      isDayInRange(
        getBusinessDayNumber(paymentEffectiveDate(payment)),
        timeContext.weekStartDayNumber,
        timeContext.todayDayNumber
      )
    );
    const paymentsMonth = recordedPayments.filter(
      (payment) => getBusinessMonthKey(paymentEffectiveDate(payment)) === timeContext.monthKey
    );

    const creditNotesToday = issuedCreditNotes.filter((invoice) =>
      isDayInRange(
        getBusinessDayNumber(invoiceEffectiveDate(invoice)),
        timeContext.todayDayNumber,
        timeContext.todayDayNumber
      )
    );
    const creditNotesWeek = issuedCreditNotes.filter((invoice) =>
      isDayInRange(
        getBusinessDayNumber(invoiceEffectiveDate(invoice)),
        timeContext.weekStartDayNumber,
        timeContext.todayDayNumber
      )
    );
    const creditNotesMonth = issuedCreditNotes.filter(
      (invoice) => getBusinessMonthKey(invoiceEffectiveDate(invoice)) === timeContext.monthKey
    );

    const invoicesMonth = issuedInvoices.filter(
      (invoice) => getBusinessMonthKey(invoiceEffectiveDate(invoice)) === timeContext.monthKey
    );

    const grossToday = sumPayments(paymentsToday);
    const creditToday = sumInvoices(creditNotesToday.map((invoice) => ({ ...invoice, totalAmount: Math.abs(Number(invoice.totalAmount || 0)) } as PortalInvoice)));
    const netToday = grossToday - creditToday;
    const netWeek = sumPayments(paymentsWeek) - sumInvoices(creditNotesWeek.map((invoice) => ({ ...invoice, totalAmount: Math.abs(Number(invoice.totalAmount || 0)) } as PortalInvoice)));
    const netMonth = sumPayments(paymentsMonth) - sumInvoices(creditNotesMonth.map((invoice) => ({ ...invoice, totalAmount: Math.abs(Number(invoice.totalAmount || 0)) } as PortalInvoice)));

    return {
      grossToday,
      creditToday,
      netToday,
      netWeek,
      netMonth,
      invoicedMonth: sumInvoices(invoicesMonth),
      collectedMonth: sumPayments(paymentsMonth)
    };
  }, [issuedCreditNotes, issuedInvoices, recordedPayments, timeContext]);

  const destinationBreakdown = useMemo(() => {
    const totals = new Map<
      string,
      {
        key: string;
        label: string;
        type: string | null;
        ordersCount: number;
        totalAmount: number;
      }
    >();

    activeOrdersWithDestination
      .filter((order) => getBusinessMonthKey(orderEffectiveDate(order)) === timeContext.monthKey)
      .forEach((order) => {
        const key = orderDestinationKey(order);
        const label = orderDestinationName(order);
        if (!key || !label) return;

        const current = totals.get(key) || {
          key,
          label,
          type: orderDestinationType(order),
          ordersCount: 0,
          totalAmount: 0
        };

        current.ordersCount += 1;
        current.totalAmount += Number(order.total || 0);
        totals.set(key, current);
      });

    return Array.from(totals.values()).sort((left, right) => right.totalAmount - left.totalAmount);
  }, [activeOrdersWithDestination, timeContext.monthKey]);

  const recentOrdersByDestination = useMemo(
    () =>
      [...activeOrdersWithDestination]
        .sort((left, right) => {
          const leftDate = coerceDate(orderEffectiveDate(left))?.getTime() || 0;
          const rightDate = coerceDate(orderEffectiveDate(right))?.getTime() || 0;
          return rightDate - leftDate;
        })
        .slice(0, 10),
    [activeOrdersWithDestination]
  );

  const visibleDestinations = useMemo(
    () => paymentDestinations.filter((destination) => showInactiveDestinations || destination.isActive),
    [paymentDestinations, showInactiveDestinations]
  );

  const recentCreditNotes = useMemo(
    () =>
      [...issuedCreditNotes]
        .sort((left, right) => {
          const leftDate = coerceDate(invoiceEffectiveDate(left))?.getTime() || 0;
          const rightDate = coerceDate(invoiceEffectiveDate(right))?.getTime() || 0;
          return rightDate - leftDate;
        })
        .slice(0, 8),
    [issuedCreditNotes]
  );

  async function refreshWorkspace(includeInactive = showInactiveDestinations) {
    const [paymentsResponse, invoicesResponse, ordersResponse, destinationsResponse] = await Promise.all([
      fetch("/api/app/payments", { cache: "no-store" }),
      fetch("/api/app/invoices", { cache: "no-store" }),
      fetch("/api/app/orders", { cache: "no-store" }),
      fetch(`/api/app/payment-destinations?includeInactive=${includeInactive ? "1" : "0"}`, { cache: "no-store" })
    ]);
    const paymentsJson = await paymentsResponse.json().catch(() => null);
    const invoicesJson = await invoicesResponse.json().catch(() => null);
    const ordersJson = await ordersResponse.json().catch(() => null);
    const destinationsJson = await destinationsResponse.json().catch(() => null);

    if (!paymentsResponse.ok) {
      throw new Error(String(paymentsJson?.error || "No se pudieron refrescar los cobros."));
    }
    if (!invoicesResponse.ok) {
      throw new Error(String(invoicesJson?.error || "No se pudieron refrescar las facturas."));
    }
    if (!ordersResponse.ok) {
      throw new Error(String(ordersJson?.error || "No se pudieron refrescar los pedidos."));
    }
    if (!destinationsResponse.ok) {
      throw new Error(String(destinationsJson?.error || "No se pudieron refrescar los destinos."));
    }

    setPayments(Array.isArray(paymentsJson?.payments) ? paymentsJson.payments : []);
    setInvoices(Array.isArray(invoicesJson?.invoices) ? invoicesJson.invoices : []);
    setOrders(Array.isArray(ordersJson?.orders) ? ordersJson.orders : []);
    setPaymentDestinations(Array.isArray(destinationsJson?.paymentDestinations) ? destinationsJson.paymentDestinations : []);
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

  async function createDestination() {
    const name = destinationForm.name.trim();
    if (!name) {
      toast.error("Nombre obligatorio", "Indica un nombre para el destino de cobro.");
      return;
    }

    setDestinationBusy("create");
    try {
      const response = await fetch("/api/app/payment-destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: destinationForm.type,
          isActive: true
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo crear el destino."));
      }

      setDestinationForm(EMPTY_DESTINATION_FORM);
      await refreshWorkspace(true);
      toast.success("Destino creado");
    } catch (error) {
      toast.error("No se pudo crear el destino", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setDestinationBusy(null);
    }
  }

  function startEditingDestination(destination: PortalPaymentDestination) {
    setEditingDestinationId(destination.id);
    setEditingDestinationDraft({
      name: destination.name,
      type: destination.type
    });
  }

  async function saveDestination(destination: PortalPaymentDestination, nextActive = destination.isActive) {
    const name = editingDestinationId === destination.id ? editingDestinationDraft.name.trim() : destination.name;
    const type = editingDestinationId === destination.id ? editingDestinationDraft.type : destination.type;

    if (!name) {
      toast.error("Nombre obligatorio", "El destino no puede quedar sin nombre.");
      return;
    }

    setDestinationBusy(destination.id);
    try {
      const response = await fetch(`/api/app/payment-destinations/${destination.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          isActive: nextActive
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo actualizar el destino."));
      }

      setEditingDestinationId(null);
      await refreshWorkspace(true);
      toast.success(nextActive ? "Destino actualizado" : "Destino desactivado");
    } catch (error) {
      toast.error("No se pudo actualizar el destino", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setDestinationBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Ingreso bruto del dia"
          value={formatMoney(financialSummary.grossToday)}
          helper="Cobros del dia de negocio"
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
        <SummaryCard
          title="Total facturado del mes"
          value={formatMoney(financialSummary.invoicedMonth)}
          helper="Facturas emitidas"
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <SummaryCard
          title="Total cobrado del mes"
          value={formatMoney(financialSummary.collectedMonth)}
          helper="Cobros registrados"
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">{visibleDestinations.length} visibles</Badge>}>
            <div>
              <CardTitle className="text-xl">Destinos de cobro</CardTitle>
              <CardDescription>Configura caja, banco o billetera desde el panel y desactiva sin perder historico.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {!readOnly ? (
              <div className="grid gap-3 rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4 md:grid-cols-[minmax(0,1fr)_180px_120px]">
                <Input
                  placeholder="Ej. Mercado Pago o Caja 1"
                  value={destinationForm.name}
                  onChange={(event) => setDestinationForm((current) => ({ ...current, name: event.target.value }))}
                />
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={destinationForm.type}
                  onChange={(event) =>
                    setDestinationForm((current) => ({
                      ...current,
                      type: event.target.value as PortalPaymentDestinationType
                    }))
                  }
                >
                  {DESTINATION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button onClick={() => void createDestination()} disabled={destinationBusy !== null}>
                  {destinationBusy === "create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Crear
                </Button>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">Las cajas quedan modeladas como un destino mas, con tipo propio para la fase futura de caja.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const nextValue = !showInactiveDestinations;
                  setShowInactiveDestinations(nextValue);
                  void refreshWorkspace(nextValue).catch(() => null);
                }}
              >
                {showInactiveDestinations ? "Ocultar inactivos" : "Ver inactivos"}
              </Button>
            </div>

            {visibleDestinations.length ? (
              visibleDestinations.map((destination) => {
                const isEditing = editingDestinationId === destination.id;
                const rowName = isEditing ? editingDestinationDraft.name : destination.name;
                const rowType = isEditing ? editingDestinationDraft.type : destination.type;

                return (
                  <div
                    key={destination.id}
                    className="grid gap-3 rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4 md:grid-cols-[minmax(0,1fr)_180px_160px]"
                  >
                    <Input
                      value={rowName}
                      disabled={!isEditing}
                      onChange={(event) => setEditingDestinationDraft((current) => ({ ...current, name: event.target.value }))}
                    />
                    <select
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={rowType}
                      disabled={!isEditing}
                      onChange={(event) =>
                        setEditingDestinationDraft((current) => ({
                          ...current,
                          type: event.target.value as PortalPaymentDestinationType
                        }))
                      }
                    >
                      {DESTINATION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={destination.isActive ? "success" : "muted"}>
                        {destination.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      {!readOnly ? (
                        <>
                          {isEditing ? (
                            <Button
                              size="sm"
                              onClick={() => void saveDestination(destination, destination.isActive)}
                              disabled={destinationBusy !== null}
                            >
                              {destinationBusy === destination.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-2 h-4 w-4" />
                              )}
                              Guardar
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => startEditingDestination(destination)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={destination.isActive ? "destructive" : "secondary"}
                            onClick={() => void saveDestination(destination, !destination.isActive)}
                            disabled={destinationBusy !== null}
                          >
                            {destination.isActive ? "Desactivar" : "Activar"}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="Todavia no hay destinos configurados"
                description="Crea Mercado Pago, Banco Nacion o Caja 1 para empezar a imputar pedidos reales."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Mes actual</Badge>}>
            <div>
              <CardTitle className="text-xl">Pedidos imputados por destino</CardTitle>
              <CardDescription>Esta lectura ya usa destinos reales guardados en pedidos, no etiquetas visuales hardcodeadas.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {destinationBreakdown.length ? (
              destinationBreakdown.map((destination) => (
                <div
                  key={destination.key}
                  className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-surface/60 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{destination.label}</p>
                    <p className="text-sm text-muted">
                      {destinationTypeLabel(destination.type)} · {destination.ordersCount} pedido(s) imputado(s)
                    </p>
                  </div>
                  <p className="text-right font-semibold">{formatMoney(destination.totalAmount)}</p>
                </div>
              ))
            ) : (
              <EmptyState
                title="Todavia no hay pedidos imputados"
                description="Cuando un pedido tenga destino de cobro, vas a ver su total agrupado aca."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">{recentOrdersByDestination.length} visibles</Badge>}>
            <div>
              <CardTitle className="text-xl">Pedidos asociados a destinos</CardTitle>
              <CardDescription>Base minima para caja futura: cada pedido puede dejar trazado a donde debia entrar la plata.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentOrdersByDestination.length ? (
              recentOrdersByDestination.map((order) => (
                <div
                  key={order.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{labelForOrderCustomer(order)}</p>
                    <p className="mt-1 truncate text-sm text-muted">{labelForOrderDestination(order)}</p>
                    <p className="mt-1 truncate text-sm text-muted">Vendedor: {labelForOrderSeller(order)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(order.total, order.currency)}</p>
                    <p className="mt-1 text-sm text-muted">{formatDateLabel(orderEffectiveDate(order))}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No hay pedidos con destino cargado"
                description="Selecciona un destino al crear un pedido manual para que aparezca en este panel."
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
                    <p className="font-semibold text-rose-300">
                      -{formatMoney(Math.abs(creditNote.totalAmount), creditNote.currency)}
                    </p>
                    <p className="mt-1 text-sm text-muted">{formatDateLabel(invoiceEffectiveDate(creditNote))}</p>
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
            <CardDescription>Los cobros siguen leyendo pagos reales y ahora conviven con destinos persistidos para pedidos.</CardDescription>
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
                    <div className="flex items-center text-sm text-muted">{paymentDestinationLabel(payment)}</div>
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
