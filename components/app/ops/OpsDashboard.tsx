"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BellRing, CalendarClock, Inbox, ShieldAlert, UserMinus, Users } from "lucide-react";
import type { ConversationRowData } from "@/components/app/inbox/types";
import { OpsLeadTable, type OpsSellerOption } from "@/components/app/ops/OpsLeadTable";
import { OpsSellerLoad, type OpsSellerLoadItem } from "@/components/app/ops/OpsSellerLoad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type OpsAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  ctaLabel?: string;
  target?: "kpis" | "unassigned" | "overdue" | "today" | "seller_load";
  href?: string;
};

const OVERLOAD_THRESHOLD = 5;

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
  const [loading, setLoading] = useState(initialConversations.length === 0 && backendReady);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [focusedSection, setFocusedSection] = useState<OpsAlert["target"] | null>(null);
  const kpisRef = useRef<HTMLDivElement | null>(null);
  const unassignedRef = useRef<HTMLDivElement | null>(null);
  const overdueRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLDivElement | null>(null);
  const sellerLoadRef = useRef<HTMLDivElement | null>(null);

  async function loadOpsData(options?: { silent?: boolean }) {
    if (!backendReady) return;
    if (!options?.silent) setLoading(true);
    try {
      const [inboxResponse, metaResponse] = await Promise.all([
        fetch("/api/app/inbox?filter=all&visibility=active", { cache: "no-store" }),
        fetch("/api/app/orders/meta", { cache: "no-store" })
      ]);

      const inboxJson = (await inboxResponse.json().catch(() => null)) as InboxListResponse | null;
      const metaJson = (await metaResponse.json().catch(() => null)) as OrdersMetaResponse | null;

      if (!inboxResponse.ok) {
        throw new Error("ops_inbox_failed");
      }
      if (!metaResponse.ok) {
        throw new Error("ops_meta_failed");
      }

      setConversations(Array.isArray(inboxJson?.conversations) ? inboxJson.conversations : []);
      setSellers(Array.isArray(metaJson?.sellers) ? metaJson.sellers : []);
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
  const sellerLoad = useMemo(() => {
    const buckets = new Map<string, OpsSellerLoadItem>();

    for (const row of activeConversations) {
      if (!row.assignedSellerUserId) continue;
      const current = buckets.get(row.assignedSellerUserId) || {
        sellerUserId: row.assignedSellerUserId,
        sellerName: row.assignedSellerName || row.assignedTo || "Sin nombre",
        totalActiveLeads: 0,
        overdueLeads: 0,
        followUpLeads: 0
      };

      current.totalActiveLeads += 1;
      if (row.nextActionAt) current.followUpLeads += 1;
      if (isOverdue(row, now)) current.overdueLeads += 1;
      buckets.set(row.assignedSellerUserId, current);
    }

    return [...buckets.values()].sort(
      (left, right) =>
        right.totalActiveLeads - left.totalActiveLeads ||
        right.overdueLeads - left.overdueLeads ||
        left.sellerName.localeCompare(right.sellerName)
    );
  }, [activeConversations, now]);
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
  }, [overdueLeads.length, sellerLoad, todayLeads.length, unassignedLeads.length]);

  function scrollToSection(target: NonNullable<OpsAlert["target"]>) {
    setFocusedSection(target);
    const node =
      target === "unassigned"
        ? unassignedRef.current
        : target === "overdue"
          ? overdueRef.current
          : target === "today"
            ? todayRef.current
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

  return (
    <div className="space-y-6">
      {!backendReady ? (
        <Card className="border-white/6 bg-card/90">
          <CardContent className="p-5 text-sm text-muted">
            OPS necesita el backend operativo para cargar conversaciones y vendedores reales.
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/6 bg-card/90">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-surface/80">
              <BellRing className="h-4.5 w-4.5 text-brandBright" />
            </span>
            <div>
              <CardTitle className="text-xl">Alertas operativas</CardTitle>
              <CardDescription>Lectura rapida de prioridades para supervision comercial.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {opsAlerts.length === 0 ? (
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 px-4 py-4 text-sm text-muted">
              No hay alertas operativas criticas en este momento.
            </div>
          ) : (
            opsAlerts.map((alert) => {
              const target = alert.target;

              return (
                <div key={alert.id} className={alertTone(alert.severity)}>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-black/10">
                      <AlertIcon severity={alert.severity} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{alert.message}</p>
                      <p className="mt-1 text-xs opacity-80">{alertSeverityLabel(alert.severity)}</p>
                    </div>
                    {alert.ctaLabel && alert.href ? (
                      <Button asChild type="button" size="sm" variant="secondary">
                        <Link href={alert.href}>{alert.ctaLabel}</Link>
                      </Button>
                    ) : null}
                    {alert.ctaLabel && target ? (
                      <Button type="button" size="sm" variant="secondary" onClick={() => scrollToSection(target)}>
                        {alert.ctaLabel}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <section ref={kpisRef} className={sectionClassName(focusedSection === "kpis", "grid gap-4 xl:grid-cols-4")}>
        <KpiCard
          icon={Inbox}
          label="Leads activos"
          value={activeConversations.length}
          helper="Conversaciones abiertas en pipeline."
          loading={loading}
        />
        <KpiCard
          icon={UserMinus}
          label="Sin asignar"
          value={unassignedLeads.length}
          helper="Leads que todavia no tienen owner."
          loading={loading}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Seguimientos vencidos"
          value={overdueLeads.length}
          helper="Requieren accion inmediata."
          loading={loading}
        />
        <KpiCard
          icon={CalendarClock}
          label="Seguimientos hoy"
          value={todayLeads.length}
          helper="Para operar durante la jornada."
          loading={loading}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div ref={unassignedRef} className={sectionClassName(focusedSection === "unassigned")}>
          <OpsLeadTable
            title="Leads sin asignar"
            description="Ideal para repartir rapido y que no queden oportunidades sin owner."
            rows={unassignedLeads}
            sellers={sellers}
            readOnly={readOnly || !backendReady}
            assigningId={assigningId}
            emptyMessage="No hay leads activos sin asignar."
            onAssign={assignSeller}
          />
        </div>

        <div ref={sellerLoadRef} className={sectionClassName(focusedSection === "seller_load")}>
          <OpsSellerLoad items={sellerLoad} />
        </div>
      </div>

      <div ref={overdueRef} className={sectionClassName(focusedSection === "overdue")}>
        <OpsLeadTable
          title="Leads vencidos"
          description="Seguimientos atrasados que conviene recuperar antes de que se enfrien."
          rows={overdueLeads}
          sellers={sellers}
          readOnly={readOnly || !backendReady}
          assigningId={assigningId}
          emptyMessage="No hay seguimientos vencidos en este momento."
          showOwner
          showFollowUp
          onAssign={assignSeller}
        />
      </div>

      <div ref={todayRef} className={sectionClassName(focusedSection === "today")}>
        <OpsLeadTable
          title="Seguimientos para hoy"
          description="Leads que conviene trabajar durante la jornada para no perder timing comercial."
          rows={todayLeads}
          sellers={sellers}
          readOnly={readOnly || !backendReady}
          assigningId={assigningId}
          emptyMessage="No hay seguimientos planificados para hoy."
          showOwner
          showFollowUp
          onAssign={assignSeller}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[color:var(--border)] bg-surface/55 px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Lectura operativa</p>
          <p className="text-xs text-muted">
            Leads activos: <span className="text-text">{activeConversations.length}</span> · Sin asignar:{" "}
            <span className="text-text">{unassignedLeads.length}</span> · Vencidos:{" "}
            <span className="text-text">{overdueLeads.length}</span>
          </p>
        </div>
        <Badge variant="warning">{sellerLoad.length} vendedores con carga</Badge>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  helper,
  loading
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="flex items-start gap-4 p-5">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
          <Icon className="h-5 w-5 text-brandBright" />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? "..." : value}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function sectionClassName(active: boolean, extra = "") {
  return `${active ? "rounded-[24px] ring-1 ring-brand/50 transition-all" : ""}${extra ? ` ${extra}` : ""}`.trim();
}

function alertTone(severity: OpsAlert["severity"]) {
  if (severity === "critical") return "rounded-[22px] border border-red-500/30 bg-red-500/10 p-4 text-red-100";
  if (severity === "warning") return "rounded-[22px] border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100";
  return "rounded-[22px] border border-sky-500/30 bg-sky-500/10 p-4 text-sky-100";
}

function alertSeverityLabel(severity: OpsAlert["severity"]) {
  if (severity === "critical") return "Atencion inmediata";
  if (severity === "warning") return "Prioridad operativa";
  return "Seguimiento informativo";
}

function AlertIcon({ severity }: { severity: OpsAlert["severity"] }) {
  if (severity === "critical") return <ShieldAlert className="h-4.5 w-4.5" />;
  if (severity === "warning") return <AlertTriangle className="h-4.5 w-4.5" />;
  return <Users className="h-4.5 w-4.5" />;
}
