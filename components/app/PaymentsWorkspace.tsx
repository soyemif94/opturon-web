"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Eye,
  Hourglass,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Wallet
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
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
  dateFrom: string;
  dateTo: string;
};

type DestinationFormState = {
  name: string;
  type: PortalPaymentDestinationType;
};

type PaymentsSummaryView =
  | "all"
  | "payments_today"
  | "credits_today"
  | "net_today"
  | "net_week"
  | "net_month"
  | "collected_month";

const EMPTY_FILTERS: PaymentFilterState = {
  search: "",
  status: "all",
  method: "all",
  contactId: "all",
  dateFrom: "",
  dateTo: ""
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
const RECENT_PAYMENTS_PER_PAGE = 6;
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
    now,
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

  if (payment.method === "cash") return "Caja";
  return "Sin clasificar";
}

function paymentMethodLabel(payment: PortalPayment) {
  const metadata = payment.metadata && typeof payment.metadata === "object" ? payment.metadata : null;
  if (typeof metadata?.paymentMethodLabel === "string" && metadata.paymentMethodLabel.trim()) {
    return metadata.paymentMethodLabel.trim();
  }
  return titleCaseLabel(payment.method);
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

function getVoidPaymentMessage(payment: PortalPayment | null | undefined) {
  const status = payment?.voidOutcome?.creditNoteStatus;
  if (status === "generated") return "Cobro anulado y nota de credito generada.";
  if (status === "already_exists") return "Este cobro ya tiene una nota de credito asociada.";
  return "Cobro anulado";
}

function getVoidPaymentErrorMessage(code: string) {
  const normalized = String(code || "").trim();
  if (normalized === "payment_void_credit_note_already_exists") return "Este cobro ya tiene una nota de credito asociada.";
  if (normalized === "payment_already_void") return "Este cobro ya estaba anulado.";
  return normalized || "No se pudo anular el cobro.";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [currentPage, setCurrentPage] = useState(1);
  const dueSoonRef = useRef<HTMLDivElement | null>(null);
  const recentPaymentsRef = useRef<HTMLDivElement | null>(null);
  const destinationsRef = useRef<HTMLDivElement | null>(null);
  const activeSummaryView = resolvePaymentsSummaryView(searchParams.get("view"));

  const timeContext = useMemo(() => getTodayContext(), []);
  const currency = payments[0]?.currency || invoices[0]?.currency || "ARS";

  const recordedPayments = useMemo(() => payments.filter((payment) => payment.status === "recorded"), [payments]);
  const issuedCreditNotes = useMemo(() => invoices.filter((invoice) => invoice.type === "credit_note" && invoice.status === "issued"), [invoices]);
  const issuedInvoices = useMemo(() => invoices.filter((invoice) => invoice.type === "invoice" && invoice.status === "issued"), [invoices]);
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
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "es"));
  }, [payments]);

  const summaryScopedPayments = useMemo(() => payments.filter((payment) => matchesPaymentSummaryView(payment, activeSummaryView, timeContext)), [activeSummaryView, payments, timeContext]);

  const filteredPayments = useMemo(() => {
    const search = normalizeSearchValue(filters.search);
    return summaryScopedPayments.filter((payment) => {
      if (filters.status !== "all" && payment.status !== filters.status) return false;
      if (filters.method !== "all" && normalizePaymentMethodValue(payment.method) !== filters.method) return false;
      if (filters.contactId !== "all" && payment.contact?.id !== filters.contactId) return false;

      const effectiveDate = paymentEffectiveDate(payment);
      if (filters.dateFrom && effectiveDate && new Date(effectiveDate) < new Date(`${filters.dateFrom}T00:00:00`)) return false;
      if (filters.dateTo && effectiveDate && new Date(effectiveDate) > new Date(`${filters.dateTo}T23:59:59`)) return false;

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
  }, [filters, summaryScopedPayments]);

  const sortedPayments = useMemo(
    () =>
      [...filteredPayments].sort((left, right) => {
        const leftDate = coerceDate(paymentEffectiveDate(left))?.getTime() || 0;
        const rightDate = coerceDate(paymentEffectiveDate(right))?.getTime() || 0;
        return rightDate - leftDate;
      }),
    [filteredPayments]
  );

  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / RECENT_PAYMENTS_PER_PAGE));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * RECENT_PAYMENTS_PER_PAGE;
    return sortedPayments.slice(start, start + RECENT_PAYMENTS_PER_PAGE);
  }, [currentPage, sortedPayments]);

  const financialSummary = useMemo(() => {
    const paymentsToday = recordedPayments.filter((payment) =>
      isDayInRange(getBusinessDayNumber(paymentEffectiveDate(payment)), timeContext.todayDayNumber, timeContext.todayDayNumber)
    );
    const paymentsWeek = recordedPayments.filter((payment) =>
      isDayInRange(getBusinessDayNumber(paymentEffectiveDate(payment)), timeContext.weekStartDayNumber, timeContext.todayDayNumber)
    );
    const paymentsMonth = recordedPayments.filter((payment) => getBusinessMonthKey(paymentEffectiveDate(payment)) === timeContext.monthKey);

    const creditNotesToday = issuedCreditNotes.filter((invoice) =>
      isDayInRange(getBusinessDayNumber(invoiceEffectiveDate(invoice)), timeContext.todayDayNumber, timeContext.todayDayNumber)
    );
    const creditNotesWeek = issuedCreditNotes.filter((invoice) =>
      isDayInRange(getBusinessDayNumber(invoiceEffectiveDate(invoice)), timeContext.weekStartDayNumber, timeContext.todayDayNumber)
    );
    const creditNotesMonth = issuedCreditNotes.filter((invoice) => getBusinessMonthKey(invoiceEffectiveDate(invoice)) === timeContext.monthKey);

    const grossToday = sumPayments(paymentsToday);
    const grossWeek = sumPayments(paymentsWeek);
    const grossMonth = sumPayments(paymentsMonth);
    const creditToday = sumInvoices(creditNotesToday.map((invoice) => ({ ...invoice, totalAmount: Math.abs(Number(invoice.totalAmount || 0)) } as PortalInvoice)));
    const netToday = grossToday - creditToday;
    const netWeek = grossWeek - sumInvoices(creditNotesWeek.map((invoice) => ({ ...invoice, totalAmount: Math.abs(Number(invoice.totalAmount || 0)) } as PortalInvoice)));
    const netMonth = grossMonth - sumInvoices(creditNotesMonth.map((invoice) => ({ ...invoice, totalAmount: Math.abs(Number(invoice.totalAmount || 0)) } as PortalInvoice)));

    return {
      grossToday,
      grossWeek,
      grossMonth,
      creditToday,
      netToday,
      netWeek,
      netMonth
    };
  }, [issuedCreditNotes, recordedPayments, timeContext]);

  const receivableSummary = useMemo(() => {
    const pendingInvoices = issuedInvoices.filter((invoice) => Number(invoice.outstandingAmount || 0) > 0);
    const overdueInvoices = pendingInvoices.filter((invoice) => {
      const dueDay = getBusinessDayNumber(invoice.dueAt);
      return dueDay !== null && dueDay < timeContext.todayDayNumber;
    });
    const paidInvoices = issuedInvoices.filter((invoice) => Number(invoice.outstandingAmount || 0) <= 0 || invoice.receivableStatus === "paid");

    return {
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length - overdueInvoices.length,
      overdueCount: overdueInvoices.length,
      pendingAmount: pendingInvoices
        .filter((invoice) => {
          const dueDay = getBusinessDayNumber(invoice.dueAt);
          return dueDay === null || dueDay >= timeContext.todayDayNumber;
        })
        .reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0),
      overdueAmount: overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount || 0), 0),
      total: paidInvoices.length + pendingInvoices.length
    };
  }, [issuedInvoices, timeContext.todayDayNumber]);

  const dueSoonInvoices = useMemo(
    () =>
      issuedInvoices
        .filter((invoice) => Number(invoice.outstandingAmount || 0) > 0)
        .filter((invoice) => {
          const dueDay = getBusinessDayNumber(invoice.dueAt);
          return dueDay !== null && dueDay >= timeContext.todayDayNumber && dueDay <= timeContext.todayDayNumber + 7;
        })
        .sort((left, right) => {
          const leftDay = getBusinessDayNumber(left.dueAt) || 0;
          const rightDay = getBusinessDayNumber(right.dueAt) || 0;
          return leftDay - rightDay;
        })
        .slice(0, 5),
    [issuedInvoices, timeContext.todayDayNumber]
  );

  const visibleDestinations = useMemo(() => paymentDestinations.filter((destination) => showInactiveDestinations || destination.isActive), [paymentDestinations, showInactiveDestinations]);
  const paymentMethodsConfigured = useMemo(() => visibleDestinations.slice().sort((left, right) => Number(right.isActive) - Number(left.isActive)), [visibleDestinations]);
  const cashBoxes = useMemo(() => paymentMethodsConfigured.filter((destination) => destination.type === "cash_box").slice(0, 4), [paymentMethodsConfigured]);

  const destinationBreakdown = useMemo(() => {
    const totals = new Map<string, { key: string; label: string; type: string | null; ordersCount: number; totalAmount: number }>();

    activeOrdersWithDestination
      .filter((order) => getBusinessMonthKey(orderEffectiveDate(order)) === timeContext.monthKey)
      .forEach((order) => {
        const key = orderDestinationKey(order);
        const label = orderDestinationName(order);
        if (!key || !label) return;

        const current = totals.get(key) || { key, label, type: orderDestinationType(order), ordersCount: 0, totalAmount: 0 };
        current.ordersCount += 1;
        current.totalAmount += Number(order.total || 0);
        totals.set(key, current);
      });

    return Array.from(totals.values()).sort((left, right) => right.totalAmount - left.totalAmount);
  }, [activeOrdersWithDestination, timeContext.monthKey]);

  const trendSeries = useMemo(() => {
    const buckets = new Map<string, { label: string; collected: number; pending: number }>();
    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, {
        label: new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date).replace(".", ""),
        collected: 0,
        pending: 0
      });
    }

    recordedPayments.forEach((payment) => {
      const date = coerceDate(paymentEffectiveDate(payment));
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      const bucket = buckets.get(date.toISOString().slice(0, 10));
      if (!bucket) return;
      bucket.collected += Number(payment.amount || 0);
    });

    issuedInvoices.forEach((invoice) => {
      const date = coerceDate(invoice.dueAt || invoiceEffectiveDate(invoice));
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      const bucket = buckets.get(date.toISOString().slice(0, 10));
      if (!bucket) return;
      bucket.pending += Math.max(Number(invoice.outstandingAmount || 0), 0);
    });

    return Array.from(buckets.values());
  }, [issuedInvoices, recordedPayments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status, filters.method, filters.contactId, filters.dateFrom, filters.dateTo, activeSummaryView]);

  function setSummaryView(view: PaymentsSummaryView) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "all") params.delete("view");
    else params.set("view", view);
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }

  function scrollToSection(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

    if (!paymentsResponse.ok) throw new Error(String(paymentsJson?.error || "No se pudieron refrescar los cobros."));
    if (!invoicesResponse.ok) throw new Error(String(invoicesJson?.error || "No se pudieron refrescar los comprobantes."));
    if (!ordersResponse.ok) throw new Error(String(ordersJson?.error || "No se pudieron refrescar los pedidos."));
    if (!destinationsResponse.ok) throw new Error(String(destinationsJson?.error || "No se pudieron refrescar los destinos."));

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
        throw new Error(getVoidPaymentErrorMessage(String(json?.error || "")));
      }
      await refreshWorkspace();
      toast.success(getVoidPaymentMessage((json?.payment as PortalPayment | null | undefined) || null));
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
      if (!response.ok) throw new Error(String(json?.error || "No se pudo crear el destino."));

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
    scrollToSection(destinationsRef);
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
        body: JSON.stringify({ name, type, isActive: nextActive })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "No se pudo actualizar el destino."));

      setEditingDestinationId(null);
      await refreshWorkspace(true);
      toast.success(nextActive ? "Destino actualizado" : "Destino desactivado");
    } catch (error) {
      toast.error("No se pudo actualizar el destino", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setDestinationBusy(null);
    }
  }

  function setQuickBoxDraft() {
    setDestinationForm({
      name: `Caja ${cashBoxes.length + 1}`,
      type: "cash_box"
    });
    scrollToSection(destinationsRef);
  }

  function exportVisiblePayments() {
    const rows = sortedPayments.map((payment) => ({
      fecha: formatDateLabel(paymentEffectiveDate(payment)),
      cliente: payment.contact?.name || "Sin contacto",
      contacto: payment.contact?.phone || "",
      referencia: payment.externalReference || payment.invoiceId || "",
      metodo: paymentMethodLabel(payment),
      destino: paymentDestinationLabel(payment),
      monto: Number(payment.amount || 0),
      estado: titleCaseLabel(payment.status)
    }));

    const csv = [
      ["Fecha", "Cliente", "Contacto", "Referencia", "Metodo", "Destino", "Monto", "Estado"].join(","),
      ...rows.map((row) =>
        [row.fecha, row.cliente, row.contacto, row.referencia, row.metodo, row.destino, row.monto, row.estado]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "opturon-cobros.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Reporte exportado", `Se prepararon ${rows.length} cobros visibles para exportar.`);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="secondary" className="rounded-2xl border-white/10 bg-white/[0.03]" onClick={exportVisiblePayments}>
          <Download className="mr-2 h-4 w-4" />
          Exportar reporte
        </Button>
        <Button asChild className="rounded-2xl px-5">
          <Link href="/app/invoices">
            <Plus className="mr-2 h-4 w-4" />
            Registrar cobro
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Cobrado hoy" value={formatMoney(financialSummary.grossToday, currency)} helper={labelForSummaryView("payments_today")} icon={Wallet} tone="success" onClick={() => setSummaryView("payments_today")} active={activeSummaryView === "payments_today"} />
        <MetricCard label="Cobrado esta semana" value={formatMoney(financialSummary.grossWeek, currency)} helper="Cobros registrados de la semana actual" icon={Landmark} tone="primary" onClick={() => setSummaryView("net_week")} active={activeSummaryView === "net_week"} />
        <MetricCard label="Cobrado este mes" value={formatMoney(financialSummary.grossMonth, currency)} helper="Cobranzas registradas del mes actual" icon={ReceiptText} tone="violet" onClick={() => setSummaryView("collected_month")} active={activeSummaryView === "collected_month"} />
        <MetricCard label="Pendiente de cobro" value={formatMoney(receivableSummary.pendingAmount, currency)} helper={`${receivableSummary.pendingCount} cobros pendientes`} icon={Hourglass} tone="warning" onClick={() => scrollToSection(dueSoonRef)} />
        <MetricCard label="Cobros vencidos" value={formatMoney(receivableSummary.overdueAmount, currency)} helper={`${receivableSummary.overdueCount} cobros vencidos`} icon={AlertTriangle} tone="danger" onClick={() => scrollToSection(dueSoonRef)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_320px]">
        <SummaryChartCard series={trendSeries} />
        <StatusDonutCard paid={receivableSummary.paidCount} pending={receivableSummary.pendingCount} overdue={receivableSummary.overdueCount} />
        <DueSoonCard invoices={dueSoonInvoices} currency={currency} refNode={dueSoonRef} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <div ref={recentPaymentsRef}>
        <Card className="overflow-hidden rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))] shadow-[0_24px_70px_rgba(2,6,23,0.36)]">
          <CardContent className="p-0">
            <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[1.9rem] font-semibold tracking-tight text-white">Cobros recientes</p>
                <p className="mt-1 text-sm text-slate-400">Buscador, filtros y lectura premium sobre los cobros reales registrados en el sistema.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {activeSummaryView !== "all" ? <Badge variant="warning">{labelForSummaryView(activeSummaryView)}</Badge> : null}
                <Badge variant="muted">{sortedPayments.length} visibles</Badge>
              </div>
            </div>

            <div className="grid gap-3 border-b border-white/8 px-4 py-4 sm:px-5 xl:grid-cols-[minmax(0,1.4fr)_180px_180px_200px_200px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input className="h-12 rounded-2xl border-white/10 bg-white/[0.03] pl-11 text-sm" placeholder="Buscar por cliente, contacto, factura o referencia..." value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
              </div>
              <FilterSelect value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} options={[{ value: "all", label: "Todos los estados" }, { value: "recorded", label: "Registrado" }, { value: "void", label: "Anulado" }]} />
              <FilterSelect value={filters.method} onChange={(value) => setFilters((current) => ({ ...current, method: value }))} options={[{ value: "all", label: "Todos los metodos" }, ...PAYMENT_METHOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))]} />
              <Input type="date" className="h-12 rounded-2xl border-white/10 bg-white/[0.03]" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
              <Input type="date" className="h-12 rounded-2xl border-white/10 bg-white/[0.03]" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
            </div>

            <div className="grid gap-3 border-b border-white/8 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_220px]">
              <FilterSelect value={filters.contactId} onChange={(value) => setFilters((current) => ({ ...current, contactId: value }))} options={[{ value: "all", label: "Todos los contactos" }, ...contactOptions.map((contact) => ({ value: contact.id, label: contact.name }))]} />
              <Button type="button" variant="secondary" className="h-12 rounded-2xl border-white/10 bg-white/[0.03]" onClick={() => setFilters(EMPTY_FILTERS)}>
                Limpiar filtros
              </Button>
            </div>

            {!payments.length ? (
              <div className="p-6">
                <EmptyState title="Todavia no hay cobros visibles" description="Cuando registres cobros apareceran aqui con su estado, saldo libre y destino." />
              </div>
            ) : !sortedPayments.length ? (
              <div className="p-6">
                <EmptyState title="No hay cobros para este filtro" description="Prueba con otro estado, metodo, fecha o contacto para volver a ver cobranzas." />
              </div>
            ) : (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {paginatedPayments.map((payment) => (
                    <MobilePaymentCard key={payment.id} payment={payment} busyAction={busyAction} readOnly={readOnly} onVoid={voidPayment} />
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <div className="min-w-[1120px]">
                    <div className="grid grid-cols-[180px_minmax(220px,1fr)_160px_140px_140px_180px_120px] gap-4 border-b border-white/8 bg-white/[0.03] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      <span>Fecha</span>
                      <span>Cliente</span>
                      <span>Factura / referencia</span>
                      <span>Metodo</span>
                      <span className="text-right">Monto</span>
                      <span>Estado</span>
                      <span className="text-right">Acciones</span>
                    </div>
                    {paginatedPayments.map((payment) => (
                      <div key={payment.id} className="grid grid-cols-[180px_minmax(220px,1fr)_160px_140px_140px_180px_120px] gap-4 border-b border-white/8 px-5 py-4 last:border-b-0">
                        <div className="text-sm text-slate-300">
                          <p>{formatDateLabel(paymentEffectiveDate(payment))}</p>
                          <p className="mt-1 text-xs text-slate-500">{paymentEffectiveDate(payment) ? new Date(String(paymentEffectiveDate(payment))).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "-"}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{payment.contact?.name || "Sin contacto"}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{payment.contact?.phone || paymentDestinationLabel(payment)}</p>
                        </div>
                        <div className="min-w-0 text-sm text-slate-300">
                          <p className="truncate">{payment.allocations?.[0]?.invoice?.invoiceNumber || payment.externalReference || payment.invoiceId || "Pago a cuenta"}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{paymentDestinationLabel(payment)}</p>
                        </div>
                        <div className="flex items-start">
                          <Badge variant={methodBadgeVariant(payment.method)}>{paymentMethodLabel(payment)}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{formatMoney(payment.amount, payment.currency)}</p>
                          <p className="mt-1 text-xs text-slate-500">Libre {formatMoney(payment.unallocatedAmount, payment.currency)}</p>
                        </div>
                        <div className="space-y-2">
                          <Badge variant={badgeToneByStatus(payment.status)}>{titleCaseLabel(payment.status)}</Badge>
                          <p className="text-xs text-slate-500">{payment.lifecycle?.canVoid ? "Con accion" : "Sin accion"}</p>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          {payment.invoiceId ? (
                            <Button asChild variant="ghost" size="sm" className="h-9 w-9 rounded-2xl border border-white/10 bg-white/[0.03] px-0">
                              <Link href={`/app/invoices/${payment.invoiceId}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : null}
                          {!readOnly && payment.lifecycle?.canVoid ? (
                            <Button variant="destructive" size="sm" className="rounded-2xl" onClick={() => void voidPayment(payment.id)} disabled={busyAction !== null}>
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
                </div>

                <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-sm text-slate-400">
                    Mostrando {sortedPayments.length ? (currentPage - 1) * RECENT_PAYMENTS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * RECENT_PAYMENTS_PER_PAGE, sortedPayments.length)} de {sortedPayments.length} cobros
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                      {currentPage} de {totalPages}
                    </div>
                    <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                      Siguiente
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </div>

        <aside className="space-y-4">
          <RailCard title="Acciones rapidas">
            <QuickActionButton icon={Download} label="Exportar reporte" helper="CSV con cobros visibles" onClick={exportVisiblePayments} />
            <QuickActionLink icon={Clock3} label="Ver vencimientos" helper="Ir a proximos 7 dias" onClick={() => scrollToSection(dueSoonRef)} />
            <QuickActionButton icon={Plus} label="Crear caja" helper="Prepara un destino tipo caja" onClick={setQuickBoxDraft} />
            <QuickActionLink icon={Settings2} label="Configurar cobros" helper="Ir a configuracion" href="/app/settings/transfer" />
          </RailCard>

          <RailCard refNode={destinationsRef} title="Metodos de pago configurados">
            <div className="space-y-3">
              {paymentMethodsConfigured.length ? (
                paymentMethodsConfigured.map((destination) => {
                  const isEditing = editingDestinationId === destination.id;
                  const rowName = isEditing ? editingDestinationDraft.name : destination.name;
                  const rowType = isEditing ? editingDestinationDraft.type : destination.type;

                  return (
                    <div key={destination.id} className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{destination.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{destinationTypeLabel(destination.type)}</p>
                        </div>
                        <Badge variant={destination.isActive ? "success" : "warning"}>{destination.isActive ? "Activo" : "Pendiente"}</Badge>
                      </div>
                      <div className="mt-3 grid gap-3">
                        <Input value={rowName} disabled={!isEditing} onChange={(event) => setEditingDestinationDraft((current) => ({ ...current, name: event.target.value }))} className="h-10 rounded-2xl border-white/10 bg-white/[0.03]" />
                        <select className="h-10 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-100" value={rowType} disabled={!isEditing} onChange={(event) => setEditingDestinationDraft((current) => ({ ...current, type: event.target.value as PortalPaymentDestinationType }))}>
                          {DESTINATION_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {!readOnly ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {isEditing ? (
                            <Button size="sm" className="rounded-2xl" onClick={() => void saveDestination(destination, destination.isActive)} disabled={destinationBusy !== null}>
                              {destinationBusy === destination.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                              Guardar
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" className="rounded-2xl border-white/10 bg-white/[0.03]" onClick={() => startEditingDestination(destination)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Configuracion
                            </Button>
                          )}
                          <Button size="sm" variant={destination.isActive ? "destructive" : "secondary"} className="rounded-2xl" onClick={() => void saveDestination(destination, !destination.isActive)} disabled={destinationBusy !== null}>
                            {destination.isActive ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <EmptyState title="No hay metodos configurados" description="Crea un destino de cobro para empezar a operar." />
              )}
            </div>

            {!readOnly ? (
              <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
                <p className="text-sm font-medium text-white">Agregar metodo de pago</p>
                <div className="mt-3 grid gap-3">
                  <Input placeholder="Ej. Mercado Pago o Caja 1" value={destinationForm.name} onChange={(event) => setDestinationForm((current) => ({ ...current, name: event.target.value }))} className="h-10 rounded-2xl border-white/10 bg-white/[0.03]" />
                  <select className="h-10 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-100" value={destinationForm.type} onChange={(event) => setDestinationForm((current) => ({ ...current, type: event.target.value as PortalPaymentDestinationType }))}>
                    {DESTINATION_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button onClick={() => void createDestination()} disabled={destinationBusy !== null} className="rounded-2xl">
                    {destinationBusy === "create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Agregar metodo de pago
                  </Button>
                </div>
              </div>
            ) : null}
          </RailCard>
        </aside>
      </section>

      <section className="grid gap-6">
        <Card className="rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))] shadow-[0_24px_70px_rgba(2,6,23,0.36)]">
          <CardContent className="p-0">
            <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[1.8rem] font-semibold tracking-tight text-white">Cajas registradas</p>
                <p className="mt-1 text-sm text-slate-400">Administrá tus cajas y controlá quién opera cada una usando los destinos reales tipo caja.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{cashBoxes.length} visibles</Badge>
                {!readOnly ? (
                  <Button type="button" variant="secondary" className="rounded-2xl border-white/10 bg-white/[0.03]" onClick={setQuickBoxDraft}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar caja
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
              {cashBoxes.length ? (
                cashBoxes.map((cashBox) => (
                  <CashBoxCard
                    key={cashBox.id}
                    destination={cashBox}
                    paymentTotal={recordedPayments.filter((payment) => paymentDestinationLabel(payment) === cashBox.name).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)}
                    orderCount={destinationBreakdown.find((item) => item.key === cashBox.id || item.label === cashBox.name)?.ordersCount || 0}
                    onEdit={() => startEditingDestination(cashBox)}
                  />
                ))
              ) : (
                <div className="xl:col-span-4">
                  <EmptyState title="No hay cajas creadas" description="Primero crea un destino de cobro tipo caja desde este mismo modulo." />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  onClick,
  active = false
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Wallet;
  tone: "success" | "primary" | "violet" | "warning" | "danger";
  onClick?: () => void;
  active?: boolean;
}) {
  const accentMap = {
    success: "from-emerald-500/20 via-emerald-400/10 to-transparent text-emerald-300",
    primary: "from-blue-500/20 via-blue-400/10 to-transparent text-blue-300",
    violet: "from-violet-500/20 via-violet-400/10 to-transparent text-violet-300",
    warning: "from-amber-500/20 via-amber-400/10 to-transparent text-amber-300",
    danger: "from-rose-500/20 via-rose-400/10 to-transparent text-rose-300"
  } as const;

  const content = (
    <Card className={cn("overflow-hidden rounded-[24px] border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))]", active && "border-[#fb923c]/35 shadow-[0_0_0_1px_rgba(251,146,60,0.15)]")}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br", accentMap[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 truncate text-[1.75rem] font-semibold leading-none tracking-tight text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-400">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (!onClick) return content;
  return (
    <button type="button" className="text-left" onClick={onClick}>
      {content}
    </button>
  );
}

function SummaryChartCard({ series }: { series: Array<{ label: string; collected: number; pending: number }> }) {
  const maxValue = Math.max(...series.map((point) => Math.max(point.collected, point.pending)), 1);
  const collectedPath = buildLinePath(series.map((point, index) => ({ x: index, y: point.collected })), maxValue);
  const pendingPath = buildLinePath(series.map((point, index) => ({ x: index, y: point.pending })), maxValue);

  return (
    <Card className="overflow-hidden rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))] shadow-[0_24px_70px_rgba(2,6,23,0.36)]">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[1.7rem] font-semibold tracking-tight text-white">Resumen de cobranzas</p>
            <p className="mt-1 text-sm text-slate-400">Lectura temporal basada en cobros registrados y saldos pendientes visibles.</p>
          </div>
          <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1 text-xs text-slate-400">
            <span className="rounded-xl bg-white/[0.04] px-3 py-2 text-white">Mes</span>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="relative h-[250px] rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              {[20, 40, 60, 80].map((line) => (
                <line key={line} x1="0" y1={line} x2="100" y2={line} stroke="rgba(148,163,184,0.12)" strokeWidth="0.6" />
              ))}
              <path d={collectedPath} fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" />
              <path d={pendingPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
            </svg>
            <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Cobrado
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Pendiente
              </span>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              {series.filter((_, index) => index % 5 === 0).map((point) => (
                <span key={point.label}>{point.label}</span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusDonutCard({ paid, pending, overdue }: { paid: number; pending: number; overdue: number }) {
  const total = Math.max(paid + pending + overdue, 1);
  const items = [
    { label: "Pagados", value: paid, color: "#22c55e" },
    { label: "Pendientes", value: pending, color: "#f59e0b" },
    { label: "Vencidos", value: overdue, color: "#ef4444" }
  ];
  const gradient = buildRingGradient(items.map((item) => ({ ...item, share: item.value / total })));

  return (
    <Card className="overflow-hidden rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))] shadow-[0_24px_70px_rgba(2,6,23,0.36)]">
      <CardContent className="p-0">
        <div className="border-b border-white/8 px-5 py-4">
          <p className="text-[1.7rem] font-semibold tracking-tight text-white">Estado general</p>
        </div>
        <div className="flex flex-col gap-6 px-5 py-5">
          <div className="flex items-center gap-5">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
              <div className="flex h-[96px] w-[96px] flex-col items-center justify-center rounded-full bg-[#07111f]">
                <span className="text-4xl font-semibold text-white">{paid + pending + overdue}</span>
                <span className="mt-1 text-sm text-slate-400">Total cobros</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              {items.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-slate-400">
                    {item.value} ({Math.round((item.value / total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[20px] border border-amber-500/18 bg-amber-500/8 px-4 py-3 text-sm text-amber-100">
            Los datos se actualizan en tiempo real con pagos, comprobantes y saldos actuales.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DueSoonCard({
  invoices,
  currency,
  refNode
}: {
  invoices: PortalInvoice[];
  currency: string;
  refNode: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={refNode}>
      <Card className="overflow-hidden rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))] shadow-[0_24px_70px_rgba(2,6,23,0.36)]">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div>
              <p className="text-[1.55rem] font-semibold tracking-tight text-white">Por vencer</p>
              <p className="text-sm text-slate-400">Proximos 7 dias</p>
            </div>
            <Badge variant="muted">Ver todos</Badge>
          </div>
          <div className="space-y-3 p-4">
            {invoices.length ? (
              invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-[22px] border border-white/8 bg-white/[0.02] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{invoice.customerLegalName || invoice.contact?.name || "Sin cliente"}</p>
                      <p className="mt-1 text-xs text-slate-500">Vence: {formatDateLabel(invoice.dueAt)}</p>
                    </div>
                    <Badge variant="outline">{invoice.invoiceNumber || invoice.internalDocumentNumber || "Comprobante"}</Badge>
                  </div>
                  <p className="mt-3 text-right text-sm font-semibold text-white">{formatMoney(invoice.outstandingAmount, invoice.currency || currency)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No hay vencimientos cercanos" description="Las cobranzas al dia apareceran aqui cuando existan saldos con vencimiento." />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select className="h-12 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-100" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function MobilePaymentCard({
  payment,
  busyAction,
  readOnly,
  onVoid
}: {
  payment: PortalPayment;
  busyAction: string | null;
  readOnly: boolean;
  onVoid: (paymentId: string) => Promise<void>;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{payment.contact?.name || "Sin contacto"}</p>
          <p className="mt-1 text-xs text-slate-500">{payment.allocations?.[0]?.invoice?.invoiceNumber || payment.externalReference || payment.invoiceId || "Pago a cuenta"}</p>
        </div>
        <Badge variant={methodBadgeVariant(payment.method)}>{paymentMethodLabel(payment)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={badgeToneByStatus(payment.status)}>{titleCaseLabel(payment.status)}</Badge>
        <Badge variant="outline">{paymentDestinationLabel(payment)}</Badge>
      </div>
      <div className="mt-3 space-y-2 text-sm text-slate-300">
        <p>Monto: {formatMoney(payment.amount, payment.currency)}</p>
        <p>Libre: {formatMoney(payment.unallocatedAmount, payment.currency)}</p>
        <p>Fecha: {formatDateLabel(paymentEffectiveDate(payment))}</p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {payment.invoiceId ? (
          <Button asChild size="sm" className="flex-1 rounded-2xl">
            <Link href={`/app/invoices/${payment.invoiceId}`}>Ver comprobante</Link>
          </Button>
        ) : null}
        {!readOnly && payment.lifecycle?.canVoid ? (
          <Button variant="destructive" size="sm" className="rounded-2xl" onClick={() => void onVoid(payment.id)} disabled={busyAction !== null}>
            {busyAction === payment.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
            Anular
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function RailCard({
  title,
  children,
  refNode
}: {
  title: string;
  children: ReactNode;
  refNode?: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={refNode} className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,15,29,0.98),rgba(5,10,20,0.95))] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.32)]">
      <p className="text-[1.45rem] font-semibold tracking-tight text-white">{title}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  helper,
  onClick
}: {
  icon: typeof Download;
  label: string;
  helper: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/14 hover:bg-white/[0.04]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-slate-200">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{label}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{helper}</p>
      </div>
    </button>
  );
}

function QuickActionLink({
  icon: Icon,
  label,
  helper,
  href,
  onClick
}: {
  icon: typeof Download;
  label: string;
  helper: string;
  href?: string;
  onClick?: () => void;
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

  if (href) return <Link href={href}>{content}</Link>;
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

function CashBoxCard({
  destination,
  paymentTotal,
  orderCount,
  onEdit
}: {
  destination: PortalPaymentDestination;
  paymentTotal: number;
  orderCount: number;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">{destination.name}</p>
          <Badge variant={destination.isActive ? "success" : "muted"}>{destination.isActive ? "Activa" : "Inactiva"}</Badge>
        </div>
        <Button type="button" variant="secondary" size="sm" className="rounded-2xl border-white/10 bg-white/[0.03]" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-300">
        <InfoRow label="Responsable" value="Sin asignar" />
        <InfoRow label="Apertura" value={formatDateLabel(destination.createdAt)} />
        <InfoRow label="Saldo actual" value={formatMoney(paymentTotal)} />
        <InfoRow label="Pedidos imputados" value={`${orderCount}`} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}

function resolvePaymentsSummaryView(value: string | null): PaymentsSummaryView {
  if (value === "payments_today" || value === "credits_today" || value === "net_today" || value === "net_week" || value === "net_month" || value === "collected_month") {
    return value;
  }
  return "all";
}

function matchesPaymentSummaryView(payment: PortalPayment, view: PaymentsSummaryView, timeContext: ReturnType<typeof getTodayContext>) {
  const effectiveDate = paymentEffectiveDate(payment);
  const dayNumber = getBusinessDayNumber(effectiveDate);
  const monthKey = getBusinessMonthKey(effectiveDate);

  if (view === "payments_today" || view === "net_today") {
    return payment.status === "recorded" && isDayInRange(dayNumber, timeContext.todayDayNumber, timeContext.todayDayNumber);
  }
  if (view === "net_week") {
    return payment.status === "recorded" && isDayInRange(dayNumber, timeContext.weekStartDayNumber, timeContext.todayDayNumber);
  }
  if (view === "net_month" || view === "collected_month") {
    return payment.status === "recorded" && monthKey === timeContext.monthKey;
  }
  return true;
}

function labelForSummaryView(view: PaymentsSummaryView) {
  switch (view) {
    case "payments_today":
      return "Cobros del dia";
    case "credits_today":
      return "Notas de credito del dia";
    case "net_today":
      return "Ingreso neto del dia";
    case "net_week":
      return "Ingreso neto semanal";
    case "net_month":
      return "Ingreso neto del mes";
    case "collected_month":
      return "Cobrado del mes";
    default:
      return "Cobros";
  }
}

function methodBadgeVariant(method: string | null | undefined): "success" | "warning" | "danger" | "outline" | "muted" {
  const normalized = normalizePaymentMethodValue(method);
  if (normalized === "bank_transfer") return "outline";
  if (normalized === "cash") return "muted";
  if (normalized === "card") return "warning";
  if (normalized === "combined") return "success";
  return "outline";
}

function buildLinePath(points: Array<{ x: number; y: number }>, maxValue: number) {
  if (!points.length) return "";
  const width = 100;
  const height = 100;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.y / maxValue) * 85 - 8;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${Math.max(4, Math.min(96, y)).toFixed(2)}`;
    })
    .join(" ");
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
