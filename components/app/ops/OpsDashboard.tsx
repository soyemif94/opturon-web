"use client";

import Link from "next/link";
import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  Clock3,
  Download,
  Filter,
  Inbox,
  Package,
  Search,
  ShieldCheck,
  UserMinus,
  UsersRound
} from "lucide-react";
import type { ConversationRowData } from "@/components/app/inbox/types";
import { OpsLeadTable, type OpsSellerOption } from "@/components/app/ops/OpsLeadTable";
import { OpsSellerLoad, type OpsSellerLoadItem } from "@/components/app/ops/OpsSellerLoad";
import type { PortalSellerMetrics } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { isActiveCommercialFollowUp, isColdLead, isInRecovery, isRecentlyCompletedFollowUp } from "@/lib/ops/commercial-state";
import { formatMoney } from "@/lib/billing";

type InboxListResponse = {
  readOnly: boolean;
  conversations: ConversationRowData[];
};

type OrdersMetaResponse = {
  sellers: OpsSellerOption[];
  currentUserId?: string | null;
};

type SellerMetricsResponse = {
  success?: boolean;
  data?: PortalSellerMetrics;
};

type OpsTab = "summary" | "team" | "followups" | "recovery" | "sales" | "reports";
type OpsReportModules = {
  sales: boolean;
  inventory: boolean;
  contacts: boolean;
  metrics: boolean;
  orders: boolean;
  invoices: boolean;
  payments: boolean;
  cash: boolean;
  catalog: boolean;
};
type SalesSnapshot = {
  summary?: { operationCount?: number; revenue?: number; averageTicket?: number; openPipelineCount?: number; currency?: string };
  bySeller?: Array<{ sellerId: string; sellerName: string; paidOperations: number; revenue: number; currency: string }>;
};

const defaultSellerMetrics: PortalSellerMetrics = {
  salesCriteria: {
    countedOrderStatuses: "status != cancelled",
    paidOrderCriteria: "paymentStatus = paid"
  },
  sellerMetrics: [],
  ordersWithoutSeller: 0,
  currency: "ARS"
};

type OpsAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  ctaLabel?: string;
  target?: "kpis" | "unassigned" | "overdue" | "today" | "future" | "completed" | "urgent" | "cold" | "seller_load";
  href?: string;
};

const OVERLOAD_THRESHOLD = 5;
const URGENT_RESPONSE_MINUTES = 30;
function isSameDay(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isOverdue(row: ConversationRowData, now = new Date()) {
  if (!row.nextActionAt) return false;
  const date = new Date(row.nextActionAt);
  return !Number.isNaN(date.getTime()) && date.getTime() < now.getTime();
}

function isActiveLead(row: ConversationRowData) {
  return row.leadStatus !== "CLOSED";
}

function isUrgentLead(row: ConversationRowData) {
  return isActiveLead(row) && row.unreadCount > 0 && row.slaMinutes >= URGENT_RESPONSE_MINUTES;
}

export function OpsDashboard({
  initialConversations,
  initialSellers,
  readOnly = false,
  backendReady,
  reportModules = { sales: false, inventory: false, contacts: false, metrics: false, orders: false, invoices: false, payments: false, cash: false, catalog: false }
}: {
  initialConversations: ConversationRowData[];
  initialSellers: OpsSellerOption[];
  readOnly?: boolean;
  backendReady: boolean;
  reportModules?: OpsReportModules;
}) {
  const [conversations, setConversations] = useState<ConversationRowData[]>(initialConversations);
  const [sellers, setSellers] = useState<OpsSellerOption[]>(initialSellers);
  const [sellerMetrics, setSellerMetrics] = useState<PortalSellerMetrics>(defaultSellerMetrics);
  const [loading, setLoading] = useState(initialConversations.length === 0 && backendReady);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [completingFollowUpId, setCompletingFollowUpId] = useState<string | null>(null);
  const [focusedSection, setFocusedSection] = useState<OpsAlert["target"] | null>(null);
  const [activeTab, setActiveTab] = useState<OpsTab>("summary");
  const [filterSellerId, setFilterSellerId] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterCondition, setFilterCondition] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [salesSnapshot, setSalesSnapshot] = useState<SalesSnapshot | null>(null);
  const [salesRequested, setSalesRequested] = useState(false);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState(false);
  const [sellerReport, setSellerReport] = useState<OpsSellerLoadItem[] | null>(null);
  const [sellerReportRequested, setSellerReportRequested] = useState(false);
  const [sellerReportLoading, setSellerReportLoading] = useState(false);
  const [sellerReportError, setSellerReportError] = useState(false);
  const kpisRef = useRef<HTMLDivElement | null>(null);
  const unassignedRef = useRef<HTMLDivElement | null>(null);
  const overdueRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);
  const futureRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef<HTMLDivElement | null>(null);
  const urgentRef = useRef<HTMLDivElement | null>(null);
  const coldRef = useRef<HTMLDivElement | null>(null);
  const sellerLoadRef = useRef<HTMLDivElement | null>(null);

  async function loadOpsData(options?: { silent?: boolean }) {
    if (!backendReady) return;
    if (!options?.silent) setLoading(true);
    try {
      const inboxQuery = new URLSearchParams({ filter: "all", visibility: "active", channel: filterChannel });
      if (filterSellerId) inboxQuery.set("sellerId", filterSellerId);
      if (filterStage) inboxQuery.set("stage", filterStage);
      if (filterCondition !== "all") inboxQuery.set("operationalState", filterCondition);
      if (filterCustomer.trim()) inboxQuery.set("q", filterCustomer.trim());
      if (filterDateFrom) inboxQuery.set("dateFrom", filterDateFrom);
      if (filterDateTo) inboxQuery.set("dateTo", filterDateTo);
      const [inboxResponse, metaResponse, sellerMetricsHttp] = await Promise.all([
        fetch(`/api/app/inbox?${inboxQuery.toString()}`, { cache: "no-store" }),
        fetch("/api/app/orders/meta", { cache: "no-store" }),
        !readOnly && reportModules.orders ? fetch("/api/app/orders/seller-metrics", { cache: "no-store" }) : Promise.resolve(null)
      ]);

      const inboxJson = (await inboxResponse.json().catch(() => null)) as InboxListResponse | null;
      const metaJson = (await metaResponse.json().catch(() => null)) as OrdersMetaResponse | null;
      const sellerMetricsJson = sellerMetricsHttp ? (await sellerMetricsHttp.json().catch(() => null)) as SellerMetricsResponse | PortalSellerMetrics | null : null;

      if (!inboxResponse.ok) {
        throw new Error("ops_inbox_failed");
      }
      if (!metaResponse.ok) {
        throw new Error("ops_meta_failed");
      }

      setConversations(Array.isArray(inboxJson?.conversations) ? inboxJson.conversations : []);
      setSellers(Array.isArray(metaJson?.sellers) ? metaJson.sellers : []);
      if (sellerMetricsHttp?.ok) {
        const payload = sellerMetricsJson && "data" in sellerMetricsJson ? sellerMetricsJson.data : sellerMetricsJson;
        setSellerMetrics(payload && typeof payload === "object" ? { ...defaultSellerMetrics, ...payload } : defaultSellerMetrics);
      } else {
        setSellerMetrics(defaultSellerMetrics);
      }
    } catch (error) {
      toast.error("No se pudo cargar OPS", error instanceof Error ? error.message : "unknown_error");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!backendReady) return;
    const timer = window.setTimeout(() => {
      void loadOpsData({ silent: initialConversations.length > 0 });
    }, 180);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendReady, filterSellerId, filterStage, filterCondition, filterChannel, filterCustomer, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (activeTab !== "sales" || readOnly || !backendReady || !reportModules.sales || salesRequested) return;
    let cancelled = false;
    setSalesRequested(true);
    setSalesLoading(true);
    const salesUrl = reportHref("sales");
    fetch(`${salesUrl}${salesUrl.includes("?") ? "&" : "?"}format=json`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error("sales_report_unavailable");
        if (!cancelled) setSalesSnapshot(data as SalesSnapshot);
      })
      .catch(() => {
        if (!cancelled) setSalesError(true);
      })
      .finally(() => {
        if (!cancelled) setSalesLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, backendReady, readOnly, reportModules.sales, salesRequested]);

  useEffect(() => {
    if (activeTab !== "team" || readOnly || !backendReady || !reportModules.orders || sellerReportRequested) return;
    let cancelled = false;
    setSellerReportRequested(true);
    setSellerReportLoading(true);
    const url = reportHref("sellers");
    fetch(`${url}${url.includes("?") ? "&" : "?"}format=json`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error("seller_report_unavailable");
        if (!cancelled) {
          const items = Array.isArray(data?.sellers) ? data.sellers : [];
          setSellerReport(items.map((item: Record<string, unknown>) => ({
            sellerUserId: String(item.sellerUserId || ""),
            sellerName: String(item.sellerName || "Vendedor"),
            totalActiveLeads: Number(item.activeLeads || 0),
            newLeads: Number(item.newLeads || 0),
            overdueLeads: Number(item.overdueFollowUps || 0),
            followUpLeads: Number(item.followUps || 0),
            coldLeads: Number(item.coldLeads || 0),
            recoveryLeads: Number(item.recoveryStarted72h || 0),
            totalOrders: Number(item.salesCount || 0),
            totalPaidOrders: Number(item.paidSalesCount || 0),
            totalRevenue: Number(item.revenue || 0),
            averageTicket: Number(item.averageTicket || 0),
            currency: String(item.currency || "ARS")
          })));
        }
      })
      .catch(() => { if (!cancelled) setSellerReportError(true); })
      .finally(() => { if (!cancelled) setSellerReportLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, backendReady, readOnly, reportModules.orders, sellerReportRequested]);

  useEffect(() => {
    setSalesSnapshot(null);
    setSalesRequested(false);
    setSalesError(false);
    setSellerReport(null);
    setSellerReportRequested(false);
    setSellerReportError(false);
  }, [filterSellerId, filterStage, filterChannel, filterCustomer, filterProduct, filterDateFrom, filterDateTo]);

  const activeConversations = useMemo(() => conversations.filter((row) => isActiveLead(row)), [conversations]);
  const now = new Date();
  const unassignedLeads = useMemo(
    () =>
      activeConversations
        .filter((row) => !row.assignedSellerUserId)
        .sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()),
    [activeConversations]
  );
  const overdueLeads = useMemo(
    () =>
      activeConversations
        .filter((row) => isOverdue(row, now))
        .sort((left, right) => new Date(left.nextActionAt || 0).getTime() - new Date(right.nextActionAt || 0).getTime()),
    [activeConversations, now]
  );
  const todayLeads = useMemo(
    () => activeConversations.filter((row) => row.nextActionAt && new Date(row.nextActionAt).getTime() >= now.getTime() && isSameDay(row.nextActionAt, now)),
    [activeConversations, now]
  );
  const futureLeads = useMemo(
    () => activeConversations.filter((row) => row.nextActionAt && new Date(row.nextActionAt).getTime() > now.getTime() && !isSameDay(row.nextActionAt, now)),
    [activeConversations, now]
  );
  const completedFollowUpLeads = useMemo(
    () => activeConversations.filter((row) => isRecentlyCompletedFollowUp(row, now)),
    [activeConversations, now]
  );
  const urgentLeads = useMemo(
    () =>
      activeConversations
        .filter((row) => isUrgentLead(row))
        .sort((left, right) => right.slaMinutes - left.slaMinutes || right.unreadCount - left.unreadCount),
    [activeConversations]
  );
  const coldLeads = useMemo(
    () =>
      activeConversations
        .filter((row) => isColdLead(row, now))
        .sort((left, right) => new Date(left.lastMessageAt).getTime() - new Date(right.lastMessageAt).getTime()),
    [activeConversations, now]
  );
  const sellerLoad = useMemo(() => {
    const buckets = new Map<string, OpsSellerLoadItem>();
    const sellerMetricsById = new Map(sellerMetrics.sellerMetrics.map((item) => [item.sellerUserId, item]));

    for (const row of activeConversations) {
      if (!row.assignedSellerUserId) continue;
      const sellerMetric = sellerMetricsById.get(row.assignedSellerUserId);
      const current = buckets.get(row.assignedSellerUserId) || {
        sellerUserId: row.assignedSellerUserId,
        sellerName: row.assignedSellerName || row.assignedTo || "Sin nombre",
        totalActiveLeads: 0,
        newLeads: 0,
        overdueLeads: 0,
        followUpLeads: 0,
        coldLeads: 0,
        recoveryLeads: 0,
        totalOrders: Number(sellerMetric?.totalOrders || 0),
        totalPaidOrders: Number(sellerMetric?.totalPaidOrders || 0),
        totalRevenue: Number(sellerMetric?.totalRevenue || 0),
        averageTicket: Number(sellerMetric?.averageTicket || 0),
        currency: sellerMetrics.currency || "ARS"
      };

      current.totalActiveLeads += 1;
      if (row.leadStatus === "NEW") current.newLeads += 1;
      if (isActiveCommercialFollowUp(row)) current.followUpLeads += 1;
      if (isOverdue(row, now)) current.overdueLeads += 1;
      if (isColdLead(row, now)) current.coldLeads += 1;
      if (isInRecovery(row, now)) current.recoveryLeads += 1;
      buckets.set(row.assignedSellerUserId, current);
    }

    for (const metric of sellerMetrics.sellerMetrics) {
      if (buckets.has(metric.sellerUserId)) continue;
      buckets.set(metric.sellerUserId, {
        sellerUserId: metric.sellerUserId,
        sellerName: metric.sellerName || "Sin nombre",
        totalActiveLeads: 0,
        newLeads: 0,
        overdueLeads: 0,
        followUpLeads: 0,
        coldLeads: 0,
        recoveryLeads: 0,
        totalOrders: Number(metric.totalOrders || 0),
        totalPaidOrders: Number(metric.totalPaidOrders || 0),
        totalRevenue: Number(metric.totalRevenue || 0),
        averageTicket: Number(metric.averageTicket || 0),
        currency: sellerMetrics.currency || "ARS"
      });
    }

    for (const seller of sellers) {
      if (buckets.has(seller.id)) continue;
      const sellerMetric = sellerMetricsById.get(seller.id);
      buckets.set(seller.id, {
        sellerUserId: seller.id,
        sellerName: seller.name || "Sin nombre",
        totalActiveLeads: 0,
        newLeads: 0,
        overdueLeads: 0,
        followUpLeads: 0,
        coldLeads: 0,
        recoveryLeads: 0,
        totalOrders: Number(sellerMetric?.totalOrders || 0),
        totalPaidOrders: Number(sellerMetric?.totalPaidOrders || 0),
        totalRevenue: Number(sellerMetric?.totalRevenue || 0),
        averageTicket: Number(sellerMetric?.averageTicket || 0),
        currency: sellerMetrics.currency || "ARS"
      });
    }

    return [...buckets.values()].sort(
      (left, right) =>
        Number(right.totalRevenue || 0) - Number(left.totalRevenue || 0) ||
        right.totalActiveLeads - left.totalActiveLeads ||
        right.overdueLeads - left.overdueLeads ||
        left.sellerName.localeCompare(right.sellerName)
    );
  }, [activeConversations, now, sellerMetrics, sellers]);

  const opsAlerts = useMemo(() => {
    const alerts: OpsAlert[] = [];
    const overloadedSeller = sellerLoad.find((item) => item.totalActiveLeads >= OVERLOAD_THRESHOLD) || null;

    if (overdueLeads.length > 0) {
      alerts.push({
        id: "overdue_follow_ups",
        severity: "critical",
        message: `Tenes ${overdueLeads.length} ${overdueLeads.length === 1 ? "seguimiento vencido" : "seguimientos vencidos"}`,
        ctaLabel: overdueLeads.length === 1 ? "Abrir lead" : "Ver vencidos",
        target: overdueLeads.length === 1 ? undefined : "overdue",
        href: overdueLeads.length === 1 ? `/app/inbox/${overdueLeads[0]?.id}` : undefined
      });
    }

    if (unassignedLeads.length > 0) {
      alerts.push({
        id: "unassigned_leads",
        severity: "critical",
        message: `Tenes ${unassignedLeads.length} ${unassignedLeads.length === 1 ? "lead sin vendedor asignado" : "leads sin vendedor asignado"}`,
        ctaLabel: "Ver sin asignar",
        target: "unassigned"
      });
    }

    if (urgentLeads.length > 0) {
      alerts.push({
        id: "urgent_leads",
        severity: "critical",
        message: `Tenes ${urgentLeads.length} ${urgentLeads.length === 1 ? "lead urgente sin respuesta" : "leads urgentes sin respuesta"}`,
        ctaLabel: urgentLeads.length === 1 ? "Abrir lead" : "Ver urgentes",
        target: urgentLeads.length === 1 ? undefined : "urgent",
        href: urgentLeads.length === 1 ? `/app/inbox/${urgentLeads[0]?.id}` : undefined
      });
    }

    if (todayLeads.length > 0) {
      alerts.push({
        id: "today_follow_ups",
        severity: "warning",
        message: `Tenes ${todayLeads.length} ${todayLeads.length === 1 ? "seguimiento para hoy" : "seguimientos para hoy"}`,
        ctaLabel: todayLeads.length === 1 ? "Abrir lead" : "Ver hoy",
        target: todayLeads.length === 1 ? undefined : "today",
        href: todayLeads.length === 1 ? `/app/inbox/${todayLeads[0]?.id}` : undefined
      });
    }

    if (coldLeads.length > 0) {
      alerts.push({
        id: "cold_leads",
        severity: "info",
        message: `Tenes ${coldLeads.length} ${coldLeads.length === 1 ? "lead frio" : "leads frios"} sin movimiento reciente`,
        ctaLabel: coldLeads.length === 1 ? "Abrir lead" : "Ver frios",
        target: coldLeads.length === 1 ? undefined : "cold",
        href: coldLeads.length === 1 ? `/app/inbox/${coldLeads[0]?.id}` : undefined
      });
    }

    if (overloadedSeller) {
      alerts.push({
        id: "seller_overload",
        severity: "warning",
        message: `${overloadedSeller.sellerName} tiene una carga alta de leads`,
        ctaLabel: "Ver carga",
        target: "seller_load"
      });
    }

    return alerts.slice(0, 5);
  }, [coldLeads, overdueLeads, sellerLoad, todayLeads, unassignedLeads, urgentLeads]);

  function scrollToSection(target: NonNullable<OpsAlert["target"]>) {
    const tabForTarget: OpsTab =
      target === "seller_load" ? "team" :
        ["overdue", "today", "future", "completed"].includes(target) ? "followups" :
          ["cold", "urgent"].includes(target) ? "recovery" : "summary";
    setActiveTab(tabForTarget);
    setFocusedSection(target);
    window.setTimeout(() => {
      const node =
        target === "unassigned"
          ? unassignedRef.current
          : target === "overdue"
            ? overdueRef.current
            : target === "today"
              ? todayRef.current
              : target === "future"
                ? futureRef.current
                : target === "completed"
                  ? completedRef.current
                  : target === "urgent"
                    ? urgentRef.current
                    : target === "cold"
                      ? coldRef.current
                      : target === "seller_load"
                        ? sellerLoadRef.current
                        : kpisRef.current;
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    window.setTimeout(() => {
      setFocusedSection((current) => (current === target ? null : current));
    }, 1800);
  }

  async function assignSeller(conversationId: string, sellerUserId: string, startRecovery = false) {
    const seller = sellers.find((item) => item.id === sellerUserId);
    if (!seller || readOnly || !backendReady || assigningId) return;

    setAssigningId(conversationId);

    try {
      const response = await fetch(`/api/app/inbox/${conversationId}/assign-seller`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerUserId, startRecovery })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "assign_seller_failed"));
      }
      await loadOpsData({ silent: true });
      toast.success(
        startRecovery ? "Lead en recuperación" : "Lead actualizado",
        startRecovery ? "La intervención quedó registrada en el historial comercial." : "La asignación se reflejó al instante en OPS."
      );
    } catch (error) {
      toast.error("No se pudo asignar el lead", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setAssigningId(null);
    }
  }

  async function completeFollowUp(conversationId: string) {
    if (!conversationId || readOnly || !backendReady || completingFollowUpId) return;
    setCompletingFollowUpId(conversationId);
    try {
      const response = await fetch(`/api/app/inbox/${conversationId}/next-action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "complete_follow_up_failed"));
      await loadOpsData({ silent: true });
      toast.success("Seguimiento completado", "La actualización quedó registrada en el historial comercial.");
    } catch (error) {
      toast.error("No se pudo completar el seguimiento", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setCompletingFollowUpId(null);
    }
  }

  const quickActions = [
    {
      id: "ops-inbox",
      label: "Abrir inbox operativo",
      detail: "Entrar a conversaciones activas",
      icon: Inbox,
      href: "/app/inbox"
    },
    {
      id: "ops-unassigned",
      label: "Ver sin asignar",
      detail: "Repartir leads pendientes",
      icon: UserMinus,
      onClick: () => scrollToSection("unassigned")
    },
    {
      id: "ops-cold",
      label: "Ver frios",
      detail: "Recuperar oportunidades quietas",
      icon: BellRing,
      onClick: () => scrollToSection("cold")
    },
    {
      id: "ops-overdue",
      label: "Ver vencidos",
      detail: "Resolver seguimientos atrasados",
      icon: CalendarClock,
      onClick: () => scrollToSection("overdue")
    },
    {
      id: "ops-seller-load",
      label: "Ver carga por vendedor",
      detail: "Detectar sobrecarga del equipo",
      icon: UsersRound,
      onClick: () => scrollToSection("seller_load")
    }
  ] as const;

  function reportHref(report: "sales" | "sellers" | "followups" | "inventory" | "movements" | "expirations") {
    const params = new URLSearchParams();
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);
    if (filterSellerId) params.set("sellerId", filterSellerId);
    if (filterStage) params.set("stage", filterStage);
    if (filterChannel !== "all") params.set("channel", filterChannel);
    if (report !== "sales" && filterCondition !== "all") params.set("operationalState", filterCondition);
    if (filterCustomer.trim()) params.set("customer", filterCustomer.trim());
    if (filterProduct.trim()) params.set("product", filterProduct.trim());
    if (filterSupplier.trim() && report === "expirations") params.set("supplier", filterSupplier.trim());
    if (filterWarehouse.trim() && report === "expirations") params.set("warehouse", filterWarehouse.trim());
    return `/api/app/ops/reports/${report}${params.size ? `?${params.toString()}` : ""}`;
  }

  const tabs: Array<{ id: OpsTab; label: string; count?: number }> = [
    { id: "summary", label: "Resumen" },
    { id: "followups", label: "Seguimientos", count: overdueLeads.length + todayLeads.length + futureLeads.length },
    { id: "recovery", label: "Recuperación", count: coldLeads.length },
    ...(!readOnly ? [
      { id: "team" as const, label: "Equipo", count: sellerLoad.length },
      { id: "sales" as const, label: "Ventas" },
      { id: "reports" as const, label: "Informes" }
    ] : [])
  ];

  return (
    <div className="space-y-4">
      {!backendReady ? (
        <Card className="border-white/6 bg-card/90">
          <CardContent className="p-5 text-sm text-muted">
            OPS necesita el backend operativo para cargar conversaciones y vendedores reales.
          </CardContent>
        </Card>
      ) : null}

      <div className="rounded-2xl border border-[color:var(--border)] bg-card/80 p-3 shadow-[var(--card-shadow)]">
        <div role="tablist" aria-label="Secciones de supervisión OPS" className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              data-testid={`ops-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === tab.id ? "bg-brand text-white" : "text-muted hover:bg-surface hover:text-text"}`}
            >
              {tab.label}{tab.count !== undefined ? <span className="ml-2 text-xs opacity-75">{tab.count}</span> : null}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 border-t border-[color:var(--border)] pt-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" aria-label="Filtros globales del informe">
          <label className="relative block">
            <span className="sr-only">Buscar cliente</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
            <input value={filterCustomer} onChange={(event) => setFilterCustomer(event.target.value)} placeholder="Cliente" className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg pl-9 pr-3 text-sm text-text" />
          </label>
          <select aria-label="Filtrar por vendedor" value={filterSellerId} onChange={(event) => setFilterSellerId(event.target.value)} className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text">
            <option value="">Todos los vendedores</option>
            {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
          </select>
          <select aria-label="Filtrar por etapa" value={filterStage} onChange={(event) => setFilterStage(event.target.value)} className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text">
            <option value="">Todas las etapas</option>
            <option value="NEW">Nuevo</option>
            <option value="IN_CONVERSATION">En conversación</option>
            <option value="FOLLOW_UP">Seguimiento</option>
          </select>
          <select aria-label="Filtrar condición operativa" value={filterCondition} onChange={(event) => setFilterCondition(event.target.value)} className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text">
            <option value="all">Toda condición</option>
            <option value="active">Activos</option>
            <option value="cold">Fríos</option>
            <option value="recovery">En recuperación</option>
          </select>
          <select aria-label="Filtrar canal" value={filterChannel} onChange={(event) => setFilterChannel(event.target.value)} className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text">
            <option value="all">Todos los canales</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
          </select>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-[color:var(--border)] bg-bg px-2 text-xs text-muted">
            Desde <input type="date" aria-label="Actividad desde" value={filterDateFrom} onChange={(event) => setFilterDateFrom(event.target.value)} className="min-w-0 bg-transparent text-xs text-text" />
          </label>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-[color:var(--border)] bg-bg px-2 text-xs text-muted">
            Hasta <input type="date" aria-label="Actividad hasta" value={filterDateTo} onChange={(event) => setFilterDateTo(event.target.value)} className="min-w-0 bg-transparent text-xs text-text" />
          </label>
          <button type="button" onClick={() => { setFilterSellerId(""); setFilterStage(""); setFilterCondition("all"); setFilterChannel("all"); setFilterCustomer(""); setFilterProduct(""); setFilterSupplier(""); setFilterWarehouse(""); setFilterDateFrom(""); setFilterDateTo(""); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 text-sm text-muted hover:text-text">
            <Filter className="h-4 w-4" /> Limpiar filtros
          </button>
          {!readOnly && (activeTab === "sales" || activeTab === "reports") ? (
            <label className="relative block">
              <span className="sr-only">Filtrar por producto</span>
              <Package className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <input value={filterProduct} onChange={(event) => setFilterProduct(event.target.value)} placeholder="Producto o SKU" className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg pl-9 pr-3 text-sm text-text" />
            </label>
          ) : null}
          {!readOnly && activeTab === "reports" && reportModules.inventory ? <>
            <input aria-label="Filtrar vencimientos por proveedor" value={filterSupplier} onChange={(event) => setFilterSupplier(event.target.value)} placeholder="Proveedor" className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" />
            <input aria-label="Filtrar vencimientos por depósito" value={filterWarehouse} onChange={(event) => setFilterWarehouse(event.target.value)} placeholder="Depósito" className="h-10 rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" />
          </> : null}
        </div>
      </div>

      {activeTab === "summary" ? <>
      <section ref={kpisRef} className={sectionClassName(focusedSection === "kpis", "grid gap-3 md:grid-cols-2 xl:grid-cols-6")}>
        <KpiCard
          icon={AlertTriangle}
          label="Alertas operativas"
          value={opsAlerts.length}
          helper={opsAlerts.length > 0 ? "Requieren atencion inmediata" : "Sin alertas criticas"}
          loading={loading}
          tone="critical"
          onClick={() => scrollToSection("unassigned")}
          trendLabel={opsAlerts.length > 0 ? "Ver alertas" : "Operacion estable"}
          trendMode="alert"
          prominent
        />
        <KpiCard
          icon={Inbox}
          label="Leads activos"
          value={activeConversations.length}
          helper="En pipeline actualmente"
          loading={loading}
          href="/app/inbox"
        />
        <KpiCard
          icon={UserMinus}
          label="Sin asignar"
          value={unassignedLeads.length}
          helper="Leads que necesitan dueno"
          loading={loading}
          active={unassignedLeads.length > 0}
          tone="attention"
          onClick={() => scrollToSection("unassigned")}
          trendLabel={unassignedLeads.length > 0 ? "Requiere accion" : "Todo cubierto"}
          trendMode="alert"
        />
        <KpiCard
          icon={BellRing}
          label="Leads frios"
          value={coldLeads.length}
          helper="Sin movimiento reciente"
          loading={loading}
          active={coldLeads.length > 0}
          tone="info"
          onClick={() => scrollToSection("cold")}
          trendLabel={coldLeads.length > 0 ? "Requiere seguimiento" : "Sin riesgo frio"}
          trendMode="info"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Vencidos"
          value={overdueLeads.length}
          helper="Seguimientos vencidos"
          loading={loading}
          active={overdueLeads.length > 0}
          tone={overdueLeads.length > 0 ? "critical" : "success"}
          onClick={() => scrollToSection("overdue")}
          trendLabel={overdueLeads.length > 0 ? "Atencion inmediata" : "Todo al dia"}
          trendMode={overdueLeads.length > 0 ? "alert" : "success"}
        />
        <KpiCard
          icon={Clock3}
          label="Atencion hoy"
          value={todayLeads.length}
          helper="Leads prioritarios"
          loading={loading}
          active={todayLeads.length > 0}
          tone="attention"
          onClick={() => scrollToSection("today")}
          trendLabel={todayLeads.length > 0 ? "Ver detalles" : "Jornada despejada"}
          trendMode="attention"
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-[28px] leading-none tracking-tight">Alertas operativas</CardTitle>
                <CardDescription className="mt-2 text-sm">
                  Situaciones que necesitan tu atencion para evitar perdida de oportunidades.
                </CardDescription>
              </div>
              <button type="button" className="text-sm font-medium text-muted transition-colors hover:text-text" onClick={() => scrollToSection("unassigned")}>
                Ver todas
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <WideAlertRow
              title="Leads sin vendedor asignado"
              detail={`Tienes ${unassignedLeads.length} leads sin responsable asignado.`}
              cta="Ver sin asignar"
              tone="critical"
              icon={UserMinus}
              onClick={() => scrollToSection("unassigned")}
            />
            <WideAlertRow
              title="Leads frios sin movimiento reciente"
              detail={`Tienes ${coldLeads.length} leads que no tienen actividad reciente.`}
              cta="Ver frios"
              tone="info"
              icon={BellRing}
              onClick={() => scrollToSection("cold")}
            />
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Acciones rapidas</CardTitle>
              <CardDescription className="mt-2 text-sm">Atajos para gestionar tu operacion comercial.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 grid-cols-2 xl:grid-cols-5 pt-0">
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.id}
                label={action.label}
                detail={action.detail}
                icon={action.icon}
                href={"href" in action ? action.href : undefined}
                onClick={"onClick" in action ? action.onClick : undefined}
              />
            ))}
          </CardContent>
        </Card>
      </section>

      </> : null}

      {activeTab === "summary" || activeTab === "team" || activeTab === "followups" || activeTab === "recovery" ? <section className="grid gap-4">
        <div className="space-y-5">
          {activeTab === "summary" ? (
          <div ref={unassignedRef} className={sectionClassName(focusedSection === "unassigned")}>
            <OpsLeadTable
              title="Leads sin asignar"
              description="Ideal para repartir rapido y que no queden oportunidades sin owner."
              rows={unassignedLeads}
              sellers={sellers}
              readOnly={readOnly || !backendReady}
              assigningId={assigningId}
              emptyMessage="No hay leads activos sin asignar."
              sectionVariant="unassigned"
              onAssign={assignSeller}
            />
          </div>
          ) : null}

          {activeTab === "followups" ? <>
          <div className="grid gap-4 xl:grid-cols-2">
            <div ref={overdueRef} className={sectionClassName(focusedSection === "overdue")}>
              <OpsLeadTable
                title="Seguimientos vencidos"
                description="Acciones comerciales atrasadas que conviene recuperar antes de que se enfrien."
                rows={overdueLeads}
                sellers={sellers}
                readOnly={readOnly || !backendReady}
                assigningId={assigningId}
                completingFollowUpId={completingFollowUpId}
                emptyMessage="No hay seguimientos vencidos en este momento."
                showOwner
                showFollowUp
                compact
                onAssign={assignSeller}
                onCompleteFollowUp={completeFollowUp}
              />
            </div>
            <div ref={todayRef} className={sectionClassName(focusedSection === "today")}>
              <OpsLeadTable
                title="Seguimientos para hoy"
                description="Leads que conviene trabajar durante la jornada."
                rows={todayLeads}
                sellers={sellers}
                readOnly={readOnly || !backendReady}
                assigningId={assigningId}
                completingFollowUpId={completingFollowUpId}
                emptyMessage="No hay seguimientos planificados para hoy."
                showOwner
                showFollowUp
                compact
                onAssign={assignSeller}
                onCompleteFollowUp={completeFollowUp}
              />
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div ref={futureRef} className={sectionClassName(focusedSection === "future")}>
              <OpsLeadTable
                title="Seguimientos futuros"
                description="Próximas acciones programadas después de hoy."
                rows={futureLeads}
                sellers={sellers}
                readOnly={readOnly || !backendReady}
                assigningId={assigningId}
                completingFollowUpId={completingFollowUpId}
                emptyMessage="No hay seguimientos futuros programados."
                showOwner
                showFollowUp
                compact
                onAssign={assignSeller}
                onCompleteFollowUp={completeFollowUp}
              />
            </div>
            <div ref={completedRef} className={sectionClassName(focusedSection === "completed")}>
              <OpsLeadTable
                title="Seguimientos completados recientemente"
                description="Historial de seguimientos cerrados durante los últimos 30 días."
                rows={completedFollowUpLeads}
                sellers={sellers}
                readOnly={readOnly || !backendReady}
                assigningId={assigningId}
                completingFollowUpId={completingFollowUpId}
                emptyMessage="Todavía no hay seguimientos completados recientemente."
                showOwner
                showFollowUp
                compact
                onAssign={assignSeller}
                onCompleteFollowUp={completeFollowUp}
              />
            </div>
          </div>
          </> : null}
        </div>

        <div className="space-y-4">
          {activeTab === "team" ? (
            <div ref={sellerLoadRef} className={sectionClassName(focusedSection === "seller_load")}>
              {!readOnly && reportModules.orders ? (
                sellerReportError
                  ? <Card><CardContent className="p-5 text-sm text-muted">No se pudo cargar el detalle de vendedor con los filtros actuales.</CardContent></Card>
                  : sellerReportLoading || !sellerReport
                    ? <Card><CardContent className="p-5 text-sm text-muted">Cargando el informe de equipo…</CardContent></Card>
                    : <OpsSellerLoad items={sellerReport} />
              ) : <OpsSellerLoad items={sellerLoad} />}
            </div>
          ) : null}

          {activeTab === "recovery" ? <>
          <div ref={coldRef} className={sectionClassName(focusedSection === "cold")}>
            <OpsLeadTable
              title="Clientes frios"
              description="Sin movimiento comercial reciente ni seguimiento activo. Reactivar registra una intervención, no envía mensajes."
              rows={coldLeads}
              sellers={sellers}
              readOnly={readOnly || !backendReady}
              assigningId={assigningId}
              emptyMessage="No hay leads fríos según la regla de 72 horas."
              showOwner
              showSlaSignals
              sectionVariant="cold"
              compact
              onAssign={assignSeller}
            />
          </div>

          <div ref={urgentRef} className={sectionClassName(focusedSection === "urgent")}>
            <OpsLeadTable
              title="Recuperados y atención prioritaria"
              description="Reactivaciones recientes y conversaciones con demora operativa por SLA."
              rows={[...urgentLeads, ...activeConversations.filter((row) => {
                return isInRecovery(row) && !urgentLeads.some((urgent) => urgent.id === row.id);
              })]}
              sellers={sellers}
              readOnly={readOnly || !backendReady}
              assigningId={assigningId}
              emptyMessage="No hay recuperaciones recientes ni leads urgentes."
              showOwner
              showSlaSignals
              compact
              onAssign={assignSeller}
            />
          </div>
          </>
          : null}
        </div>
      </section>
      : null}

      {activeTab === "sales" ? (
        <SalesOverview snapshot={salesSnapshot} loading={salesLoading} error={salesError} enabled={reportModules.sales} reportHref={reportHref("sales")} />
      ) : null}

      {activeTab === "reports" ? (
        <OpsReportsCenter
          modules={reportModules}
          readOnly={readOnly}
          reportHrefs={{
            sales: reportHref("sales"), sellers: reportHref("sellers"), followups: reportHref("followups"),
            inventory: reportHref("inventory"), movements: reportHref("movements"), expirations: reportHref("expirations")
          }}
        />
      ) : null}
    </div>
  );
}

function SalesOverview({
  snapshot,
  loading,
  error,
  enabled,
  reportHref
}: {
  snapshot: SalesSnapshot | null;
  loading: boolean;
  error: boolean;
  enabled: boolean;
  reportHref: string;
}) {
  if (!enabled) return <Card><CardContent className="p-5 text-sm text-muted">El módulo de ventas no está habilitado para este espacio.</CardContent></Card>;
  const currency = snapshot?.summary?.currency || "ARS";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-semibold">Ventas del período</h2><p className="mt-1 text-sm text-muted">Pedidos cobrados y pipeline abiertos, tenant-scoped y filtrados en servidor.</p></div>
        <div className="flex gap-2">
          <a href={reportHref} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"><Download className="h-4 w-4" /> Descargar CSV</a>
          <Link href="/app/sales" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[color:var(--border)] px-4 text-sm font-semibold">Abrir ventas</Link>
        </div>
      </div>
      {error ? <Card><CardContent className="p-5 text-sm text-muted">No se pudo cargar el resumen. El resto de OPS y los informes disponibles siguen operativos.</CardContent></Card> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={BarChart3} label="Operaciones cobradas" value={Number(snapshot?.summary?.operationCount || 0)} helper="Pedidos pagados no cancelados" loading={loading} />
        <Card className="border-white/6 bg-card/90"><CardContent className="p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-muted">Importe cobrado</p><p className="mt-2 text-2xl font-semibold">{loading ? "…" : formatMoney(Number(snapshot?.summary?.revenue || 0), currency)}</p><p className="mt-1 text-sm text-muted">Según pedidos reales del período</p></CardContent></Card>
        <KpiCard icon={Inbox} label="Pipeline abierto" value={Number(snapshot?.summary?.openPipelineCount || 0)} helper="Conversaciones no cerradas" loading={loading} />
        <Card className="border-white/6 bg-card/90"><CardContent className="p-4"><p className="text-[11px] uppercase tracking-[0.18em] text-muted">Ticket promedio cobrado</p><p className="mt-2 text-2xl font-semibold">{loading ? "…" : formatMoney(Number(snapshot?.summary?.averageTicket || 0), currency)}</p><p className="mt-1 text-sm text-muted">Importe cobrado ÷ operaciones cobradas</p></CardContent></Card>
      </div>
      <Card className="border-white/6 bg-card/90">
        <CardHeader><CardTitle className="text-lg">Ventas por vendedor</CardTitle><CardDescription>Operaciones cobradas agrupadas por responsable.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(snapshot?.bySeller || []).map((seller) => (
            <div key={seller.sellerId} className="rounded-xl border border-[color:var(--border)] p-4">
              <p className="font-semibold">{seller.sellerName}</p>
              <p className="mt-2 text-sm text-muted">Operaciones cobradas: {seller.paidOperations}</p>
              <p className="mt-1 text-sm">Importe cobrado: {formatMoney(Number(seller.revenue || 0), seller.currency || currency)}</p>
            </div>
          ))}
          {!loading && !snapshot?.bySeller?.length ? <p className="text-sm text-muted">No hay ventas cobradas por vendedor en este período.</p> : null}
        </CardContent>
      </Card>
      <p className="text-xs text-muted">La comparación con períodos anteriores y el forecast requieren fuentes históricas adicionales; no se muestran estimaciones.</p>
    </div>
  );
}

function OpsReportsCenter({
  modules,
  readOnly,
  reportHrefs
}: {
  modules: OpsReportModules;
  readOnly: boolean;
  reportHrefs: { sales: string; sellers: string; followups: string; inventory: string; movements: string; expirations: string };
}) {
  const reports = [
    ...(modules.sales && modules.orders ? [
      { title: "Ventas y operaciones", description: "Operaciones, responsable, cliente, canal, estado, importe y productos.", href: reportHrefs.sales }
    ] : []),
    ...(modules.sales && modules.orders ? [
      { title: "Rendimiento por vendedor", description: "Leads activos, nuevos, seguimientos, recuperaciones y ventas cobradas.", href: reportHrefs.sellers }
    ] : []),
    { title: "Actividad y seguimientos", description: "Fechas de próxima acción, cumplimiento y responsable; sin teléfonos ni correos.", href: reportHrefs.followups },
    ...(modules.inventory ? [
      { title: "Inventario actual", description: "Stock por producto, SKU, categoría y ubicación según existencias reales.", href: reportHrefs.inventory },
      { title: "Movimientos de inventario", description: "Entradas, salidas y ajustes con fecha, producto, cantidad, motivo y actor.", href: reportHrefs.movements },
      { title: "Lotes y vencimientos", description: "Lotes persistidos y estados de vencimiento; exportación limitada a 250 filas por descarga.", href: reportHrefs.expirations }
    ] : [])
  ];
  const destinations = [
    ...(modules.sales ? [{ title: "Ventas y pipeline", href: "/app/sales" }] : []),
    ...(modules.metrics ? [{ title: "Métricas", href: "/app/metrics" }] : []),
    ...(modules.contacts ? [{ title: "Clientes", href: "/app/contacts" }] : []),
    ...(modules.catalog ? [{ title: "Productos", href: "/app/catalog" }] : []),
    ...(modules.inventory ? [
      { title: "Inventario", href: "/app/inventory" },
      { title: "Movimientos", href: "/app/inventory/movements" },
      { title: "Lotes y vencimientos", href: "/app/inventory/lots" },
      { title: "Compras y proveedores", href: "/app/inventory/receipts" }
    ] : []),
    ...(modules.orders ? [{ title: "Pedidos", href: "/app/orders" }] : []),
    ...(modules.invoices ? [{ title: "Comprobantes", href: "/app/invoices" }] : []),
    ...(modules.payments ? [{ title: "Cobros", href: "/app/payments" }] : []),
    ...(modules.cash ? [{ title: "Caja", href: "/app/cash" }] : [])
  ];
  return (
    <div className="space-y-5">
      <div><h2 className="text-2xl font-semibold">Centro de informes</h2><p className="mt-1 text-sm text-muted">Descargas generadas en servidor, dentro del tenant activo y con filtros aplicados.</p></div>
      {readOnly ? <Card><CardContent className="p-5 text-sm text-muted">Los informes gerenciales requieren permiso de supervisión.</CardContent></Card> : (
        <div className="grid gap-3 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.title} className="border-white/6 bg-card/90">
              <CardContent className="flex h-full flex-col p-5">
                <h3 className="font-semibold">{report.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">{report.description}</p>
                <a href={report.href} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"><Download className="h-4 w-4" /> Descargar CSV</a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card className="border-white/6 bg-card/90">
        <CardHeader><CardTitle className="text-lg">Fuentes disponibles por plan</CardTitle><CardDescription>Se muestran sólo destinos habilitados por módulos y capabilities efectivos.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {destinations.map((item) => <Link key={item.href} href={item.href} className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:border-brand/40">{item.title} →</Link>)}
          {!destinations.length ? <p className="text-sm text-muted">No hay módulos de informes habilitados.</p> : null}
        </CardContent>
      </Card>
      <p className="text-xs text-muted">XLSX/PDF ejecutivos y reportes programados quedan diferidos; no se simulan datos ni variaciones sin fuente histórica confiable.</p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  helper,
  loading,
  active = false,
  tone = "default",
  href,
  onClick,
  trendLabel,
  trendMode = "neutral",
  sparkline,
  prominent = false
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
  loading?: boolean;
  active?: boolean;
  tone?: "default" | "critical" | "info" | "attention" | "calm" | "success";
  href?: string;
  onClick?: () => void;
  trendLabel?: string;
  trendMode?: "neutral" | "up" | "alert" | "info" | "attention" | "success";
  sparkline?: number[];
  prominent?: boolean;
}) {
  const toneClassName =
    tone === "critical"
      ? "border-red-500/20 bg-[linear-gradient(180deg,rgba(167,40,40,0.12),rgba(255,255,255,0.02))]"
      : tone === "attention"
        ? "border-[#c27a2c]/24 bg-[linear-gradient(180deg,rgba(192,80,0,0.10),rgba(255,255,255,0.02))]"
        : tone === "success"
          ? "border-emerald-500/18 bg-[linear-gradient(180deg,rgba(34,120,84,0.10),rgba(255,255,255,0.02))]"
        : tone === "calm" || tone === "info"
          ? "border-sky-500/18 bg-[linear-gradient(180deg,rgba(56,122,180,0.10),rgba(255,255,255,0.02))]"
          : "border-white/6 bg-card/90";
  const interactiveClassName = href || onClick ? "cursor-pointer transition-colors hover:border-brand/35 hover:bg-brand/8" : "";
  const trendClassName =
    trendMode === "alert"
      ? "text-brandBright"
      : trendMode === "up"
        ? "text-emerald-300"
        : trendMode === "info"
          ? "text-sky-300"
          : trendMode === "success"
            ? "text-emerald-300"
            : trendMode === "attention"
              ? "text-[#f2a44c]"
              : "text-muted";

  const content = (
    <Card className={`${toneClassName} ${interactiveClassName} ${active ? "ring-1 ring-current/20" : ""} shadow-[var(--card-shadow)]`}>
      <CardContent className={`flex items-start gap-4 ${prominent ? "p-5" : "p-4"}`}>
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
          <Icon className="h-5 w-5 text-brandBright" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? "..." : value}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{helper}</p>
          {trendLabel ? <p className={`mt-2 text-xs font-medium ${trendClassName}`}>{trendLabel}</p> : null}
          {sparkline?.length ? <Sparkline values={sparkline} tone={trendMode} className="mt-3" /> : null}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className="block text-left" onClick={onClick}>
        {content}
      </button>
    );
  }

  return content;
}

function QuickActionCard({
  label,
  detail,
  icon: Icon,
  href,
  onClick
}: {
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "group rounded-[20px] border border-[color:var(--border)] bg-surface/55 px-3 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-card";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brandBright">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted transition-colors group-hover:text-text">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-text">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

function WideAlertRow({
  title,
  detail,
  cta,
  tone,
  icon: Icon,
  onClick
}: {
  title: string;
  detail: string;
  cta: string;
  tone: "critical" | "info";
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  const toneClassName =
    tone === "critical"
      ? "border-red-500/30 bg-[linear-gradient(180deg,rgba(120,26,26,0.24),rgba(255,255,255,0.02))]"
      : "border-sky-500/22 bg-[linear-gradient(180deg,rgba(27,84,120,0.20),rgba(255,255,255,0.02))]";

  return (
    <div className={`flex flex-col gap-3 rounded-[22px] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${toneClassName}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-black/10">
          <Icon className="h-4.5 w-4.5 text-brandBright" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">{title}</p>
          <p className="mt-1 text-sm text-muted">{detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-black/10 px-4 text-sm font-medium text-text transition-colors hover:border-brand/35 hover:text-brandBright"
      >
        {cta}
      </button>
    </div>
  );
}

function OpsMicroMetric({
  label,
  value,
  helper,
  accent = "default"
}: {
  label: string;
  value: number;
  helper: string;
  accent?: "default" | "amber" | "green" | "red" | "sky";
}) {
  const accentClassName =
    accent === "amber"
      ? "text-[#f2a44c]"
      : accent === "green"
        ? "text-emerald-300"
        : accent === "red"
          ? "text-red-300"
          : accent === "sky"
            ? "text-sky-300"
            : "text-text";

  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-bg/55 px-3.5 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accentClassName}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted">{helper}</p> : null}
    </div>
  );
}

function SellerLoadRing({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-white/10 border-t-brand">
        <span className="text-3xl font-semibold">{total}</span>
      </div>
      <p className="mt-3 text-sm font-medium">Leads totales</p>
    </div>
  );
}

function Sparkline({
  values,
  tone,
  className = ""
}: {
  values: number[];
  tone: "neutral" | "up" | "alert" | "info" | "attention" | "success";
  className?: string;
}) {
  if (!values.length) return null;
  const width = 92;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const stroke =
    tone === "up" || tone === "success"
      ? "#34d399"
      : tone === "alert"
        ? "#f59e0b"
        : tone === "info"
          ? "#4da3ff"
          : tone === "attention"
            ? "#f2a44c"
            : "#a78bfa";

  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function sectionClassName(active: boolean, extra = "") {
  return `${active ? "rounded-[24px] ring-1 ring-brand/50 transition-all" : ""}${extra ? ` ${extra}` : ""}`.trim();
}

function priorityTone(severity: "critical" | "warning" | "info" | "attention") {
  if (severity === "critical") return "rounded-[22px] border border-red-500/30 bg-red-500/10 p-4 text-red-100";
  if (severity === "warning") return "rounded-[22px] border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100";
  if (severity === "attention") return "rounded-[22px] border border-[#c27a2c]/30 bg-[linear-gradient(180deg,rgba(192,80,0,0.12),rgba(255,255,255,0.02))] p-4 text-[#ffe1bf]";
  return "rounded-[22px] border border-sky-500/30 bg-sky-500/10 p-4 text-sky-100";
}

function formatCurrency(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}
