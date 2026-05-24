"use client";

import Link from "next/link";
import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  Clock3,
  Inbox,
  ShieldCheck,
  UserMinus,
  UsersRound
} from "lucide-react";
import type { ConversationRowData } from "@/components/app/inbox/types";
import { OpsLeadTable, type OpsSellerOption } from "@/components/app/ops/OpsLeadTable";
import { OpsSellerLoad, type OpsSellerLoadItem } from "@/components/app/ops/OpsSellerLoad";
import type { PortalSellerMetrics } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

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
  target?: "kpis" | "unassigned" | "overdue" | "today" | "urgent" | "cold" | "seller_load";
  href?: string;
};

const OVERLOAD_THRESHOLD = 5;
const URGENT_RESPONSE_MINUTES = 30;
const COLD_LEAD_HOURS = 72;

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

function isColdLead(row: ConversationRowData, now = new Date()) {
  if (!isActiveLead(row)) return false;
  if (row.unreadCount > 0 || row.nextActionAt) return false;
  const lastMessageAt = new Date(row.lastMessageAt);
  if (Number.isNaN(lastMessageAt.getTime())) return false;
  return now.getTime() - lastMessageAt.getTime() >= COLD_LEAD_HOURS * 60 * 60 * 1000;
}

export function OpsDashboard({
  initialConversations,
  initialSellers,
  readOnly = false,
  backendReady
}: {
  initialConversations: ConversationRowData[];
  initialSellers: OpsSellerOption[];
  readOnly?: boolean;
  backendReady: boolean;
}) {
  const [conversations, setConversations] = useState<ConversationRowData[]>(initialConversations);
  const [sellers, setSellers] = useState<OpsSellerOption[]>(initialSellers);
  const [sellerMetrics, setSellerMetrics] = useState<PortalSellerMetrics>(defaultSellerMetrics);
  const [loading, setLoading] = useState(initialConversations.length === 0 && backendReady);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [focusedSection, setFocusedSection] = useState<OpsAlert["target"] | null>(null);
  const kpisRef = useRef<HTMLDivElement | null>(null);
  const unassignedRef = useRef<HTMLDivElement | null>(null);
  const overdueRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);
  const urgentRef = useRef<HTMLDivElement | null>(null);
  const coldRef = useRef<HTMLDivElement | null>(null);
  const sellerLoadRef = useRef<HTMLDivElement | null>(null);

  async function loadOpsData(options?: { silent?: boolean }) {
    if (!backendReady) return;
    if (!options?.silent) setLoading(true);
    try {
      const [inboxResponse, metaResponse, sellerMetricsHttp] = await Promise.all([
        fetch("/api/app/inbox?filter=all&visibility=active", { cache: "no-store" }),
        fetch("/api/app/orders/meta", { cache: "no-store" }),
        fetch("/api/app/orders/seller-metrics", { cache: "no-store" })
      ]);

      const inboxJson = (await inboxResponse.json().catch(() => null)) as InboxListResponse | null;
      const metaJson = (await metaResponse.json().catch(() => null)) as OrdersMetaResponse | null;
      const sellerMetricsJson = (await sellerMetricsHttp.json().catch(() => null)) as SellerMetricsResponse | PortalSellerMetrics | null;

      if (!inboxResponse.ok) {
        throw new Error("ops_inbox_failed");
      }
      if (!metaResponse.ok) {
        throw new Error("ops_meta_failed");
      }

      setConversations(Array.isArray(inboxJson?.conversations) ? inboxJson.conversations : []);
      setSellers(Array.isArray(metaJson?.sellers) ? metaJson.sellers : []);
      if (sellerMetricsHttp.ok) {
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
    void loadOpsData({ silent: initialConversations.length > 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendReady]);

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
    () => activeConversations.filter((row) => row.nextActionAt && isSameDay(row.nextActionAt, now)),
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
        overdueLeads: 0,
        followUpLeads: 0,
        totalOrders: Number(sellerMetric?.totalOrders || 0),
        totalPaidOrders: Number(sellerMetric?.totalPaidOrders || 0),
        totalRevenue: Number(sellerMetric?.totalRevenue || 0),
        averageTicket: Number(sellerMetric?.averageTicket || 0),
        currency: sellerMetrics.currency || "ARS"
      };

      current.totalActiveLeads += 1;
      if (row.nextActionAt) current.followUpLeads += 1;
      if (isOverdue(row, now)) current.overdueLeads += 1;
      buckets.set(row.assignedSellerUserId, current);
    }

    for (const metric of sellerMetrics.sellerMetrics) {
      if (buckets.has(metric.sellerUserId)) continue;
      buckets.set(metric.sellerUserId, {
        sellerUserId: metric.sellerUserId,
        sellerName: metric.sellerName || "Sin nombre",
        totalActiveLeads: 0,
        overdueLeads: 0,
        followUpLeads: 0,
        totalOrders: Number(metric.totalOrders || 0),
        totalPaidOrders: Number(metric.totalPaidOrders || 0),
        totalRevenue: Number(metric.totalRevenue || 0),
        averageTicket: Number(metric.averageTicket || 0),
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
  }, [activeConversations, now, sellerMetrics]);

  const topSeller = sellerLoad[0] || null;
  const sellerNeedingHelp =
    sellerLoad
      .filter((item) => item.totalActiveLeads > 0)
      .sort((left, right) => right.overdueLeads - left.overdueLeads || right.totalActiveLeads - left.totalActiveLeads)[0] || null;

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
    setFocusedSection(target);
    const node =
      target === "unassigned"
        ? unassignedRef.current
        : target === "overdue"
          ? overdueRef.current
          : target === "today"
            ? todayRef.current
            : target === "urgent"
              ? urgentRef.current
              : target === "cold"
                ? coldRef.current
                : target === "seller_load"
                  ? sellerLoadRef.current
                  : kpisRef.current;
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.setTimeout(() => {
      setFocusedSection((current) => (current === target ? null : current));
    }, 1800);
  }

  async function assignSeller(conversationId: string, sellerUserId: string) {
    const seller = sellers.find((item) => item.id === sellerUserId);
    if (!seller || readOnly || !backendReady || assigningId) return;

    const snapshot = conversations;
    setAssigningId(conversationId);
    setConversations((prev) =>
      prev.map((row) =>
        row.id === conversationId
          ? {
              ...row,
              assignedSellerUserId: seller.id,
              assignedSellerName: seller.name,
              assignedSellerRole: seller.role,
              assignedTo: seller.name,
              leadStatus: row.leadStatus === "NEW" ? "IN_CONVERSATION" : row.leadStatus,
              leadStatusLabel: row.leadStatus === "NEW" ? "En conversacion" : row.leadStatusLabel
            }
          : row
      )
    );

    try {
      const response = await fetch(`/api/app/inbox/${conversationId}/assign-seller`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerUserId })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "assign_seller_failed"));
      }
      toast.success("Lead actualizado", "La asignacion se reflejo al instante en OPS.");
    } catch (error) {
      setConversations(snapshot);
      toast.error("No se pudo asignar el lead", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setAssigningId(null);
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

  return (
    <div className="space-y-4">
      {!backendReady ? (
        <Card className="border-white/6 bg-card/90">
          <CardContent className="p-5 text-sm text-muted">
            OPS necesita el backend operativo para cargar conversaciones y vendedores reales.
          </CardContent>
        </Card>
      ) : null}

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
          trendLabel="12% vs semana anterior"
          trendMode="up"
          sparkline={[22, 24, 28, 26, 29, 32, 30, 35]}
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
          sparkline={[9, 8, 7, 6, 7, 6, 5, 6]}
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
          sparkline={[2, 3, 2, 4, 4, 5, 5, 6]}
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
          sparkline={[1, 1, 1, 0, 0, 0, 0, 0]}
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(350px,0.8fr)]">
        <div className="space-y-5">
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

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
            <div ref={overdueRef} className={sectionClassName(focusedSection === "overdue")}>
              <OpsLeadTable
                title="Seguimientos vencidos"
                description="Acciones comerciales atrasadas que conviene recuperar antes de que se enfrien."
                rows={overdueLeads}
                sellers={sellers}
                readOnly={readOnly || !backendReady}
                assigningId={assigningId}
                emptyMessage="No hay seguimientos vencidos en este momento."
                showOwner
                showFollowUp
                compact
                onAssign={assignSeller}
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
                emptyMessage="No hay seguimientos planificados para hoy."
                showOwner
                showFollowUp
                compact
                onAssign={assignSeller}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-[28px] leading-none tracking-tight">Carga por vendedor</CardTitle>
                  <CardDescription className="mt-2 text-sm">
                    Distribucion actual del pipeline por vendedor.
                  </CardDescription>
                </div>
                <Badge variant="warning">{topSeller?.totalActiveLeads || 0} activos</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              <div className="grid gap-3 xl:grid-cols-[140px_minmax(0,1fr)]">
                <SellerLoadRing total={activeConversations.length} />
                <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4">
                  <p className="text-sm font-semibold">{topSeller?.sellerName || "Sin datos"}</p>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <OpsMicroMetric label="Activos" value={topSeller?.totalActiveLeads || 0} helper="" />
                    <OpsMicroMetric label="Vencidos" value={topSeller?.overdueLeads || 0} helper="" />
                    <OpsMicroMetric label="Seguimiento" value={topSeller?.followUpLeads || 0} helper="" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Badge variant={sellerNeedingHelp?.overdueLeads ? "warning" : "success"}>
                      {sellerNeedingHelp?.overdueLeads ? "Necesita seguimiento" : "Carga estable"}
                    </Badge>
                    <span>Conversion pagada: {topSeller && topSeller.totalOrders ? Math.round(((topSeller.totalPaidOrders || 0) / topSeller.totalOrders) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div ref={sellerLoadRef} className={sectionClassName(focusedSection === "seller_load")}>
            <OpsSellerLoad items={sellerLoad} />
          </div>

          <div ref={coldRef} className={sectionClassName(focusedSection === "cold")}>
            <OpsLeadTable
              title="Clientes frios"
              description="Sin movimiento reciente ni seguimiento activo para reactivar o cerrar criterio."
              rows={coldLeads}
              sellers={sellers}
              readOnly={readOnly || !backendReady}
              assigningId={assigningId}
              emptyMessage="No hay leads frios segun el criterio basico actual."
              showOwner
              showSlaSignals
              sectionVariant="cold"
              compact
              onAssign={assignSeller}
            />
          </div>

          <div ref={urgentRef} className={sectionClassName(focusedSection === "urgent")}>
          <OpsLeadTable
            title="Oportunidades que requieren accion"
            description="Inbound reciente con demora operativa segun el SLA basico."
            rows={urgentLeads}
            sellers={sellers}
            readOnly={readOnly || !backendReady}
            assigningId={assigningId}
            emptyMessage="No hay leads urgentes segun el SLA basico actual."
            showOwner
            showSlaSignals
            compact
            onAssign={assignSeller}
          />
        </div>
        </div>
      </section>
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
