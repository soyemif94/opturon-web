"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  Clock3,
  Eye,
  History,
  ListOrdered,
  Loader2,
  LockKeyhole,
  Printer,
  Store,
  UnlockKeyhole,
  Wallet
} from "lucide-react";
import type { PortalCashBoxOverview, PortalCashSession } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { CashCalculator } from "@/components/app/cash-calculator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type CashHubProps = {
  initialCashBoxes: PortalCashBoxOverview[];
  initialRecentClosedSessions: PortalCashSession[];
  backendReady: boolean;
  readOnly?: boolean;
};

type CashSectionKey = "boxes" | "sessions" | "history" | "calculator" | "movements";

type OpenFormState = {
  paymentDestinationId: string;
  openingAmount: string;
  notes: string;
};

type CloseFormState = Record<
  string,
  {
    cashAmount: string;
    transferAmount: string;
    notes: string;
  }
>;

type VisibleOrder = {
  id: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  createdAt: string | null;
  sellerName: string;
  sessionName: string;
};

const EMPTY_OPEN_FORM: OpenFormState = {
  paymentDestinationId: "",
  openingAmount: "",
  notes: ""
};

function getCashErrorMessage(code: string, action: "open" | "close" | "refresh") {
  const normalized = String(code || "").trim();
  if (!normalized) {
    return action === "refresh"
      ? "No se pudo actualizar la caja."
      : action === "open"
        ? "No se pudo abrir la caja."
        : "No se pudo cerrar la caja.";
  }

  switch (normalized) {
    case "cash_open_actor_not_allowed":
    case "cash_open_user_not_found":
      return "No tenes permisos para abrir caja.";
    case "cash_close_actor_not_allowed":
    case "cash_close_user_not_found":
      return "No tenes permisos para cerrar caja.";
    case "cash_session_already_open":
      return "Ya existe una caja abierta para esta sucursal.";
    case "cash_box_destination_not_found":
      return "La caja seleccionada no esta disponible.";
    case "cash_box_destination_inactive":
      return "La caja seleccionada esta inactiva.";
    case "cash_close_session_not_found":
      return "La sesion de caja ya no esta disponible.";
    case "cash_close_session_already_closed":
      return "La caja ya estaba cerrada.";
    default:
      return normalized;
  }
}

function formatCurrency(value: number | null | undefined, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

function formatDate(value: string | null | undefined) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatDifference(value: number | null | undefined) {
  const numeric = Number(value || 0);
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${formatCurrency(numeric)}`;
}

function differenceVariant(value: number | null | undefined) {
  const numeric = Number(value || 0);
  if (numeric === 0) return "success" as const;
  return numeric > 0 ? "warning" as const : "danger" as const;
}

function getCloseFormTotals(form?: { cashAmount: string; transferAmount: string; notes: string }) {
  const cashAmount = Number(form?.cashAmount || 0);
  const transferAmount = Number(form?.transferAmount || 0);
  return {
    cashAmount,
    transferAmount,
    countedAmount: cashAmount + transferAmount
  };
}

function formatCountedBreakdown(value: number | null | undefined) {
  return value === null || value === undefined ? "No registrado" : formatCurrency(value);
}

function isToday(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function CashHub({
  initialCashBoxes,
  initialRecentClosedSessions,
  backendReady,
  readOnly = false
}: CashHubProps) {
  const [cashBoxes, setCashBoxes] = useState(initialCashBoxes);
  const [recentClosedSessions, setRecentClosedSessions] = useState(initialRecentClosedSessions);
  const [openForm, setOpenForm] = useState<OpenFormState>(() => ({
    ...EMPTY_OPEN_FORM,
    paymentDestinationId: initialCashBoxes.find((box) => box.isActive && !box.currentSession)?.id || ""
  }));
  const [closeForms, setCloseForms] = useState<CloseFormState>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<CashSectionKey | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialCashBoxes.find((box) => box.currentSession)?.currentSession?.id || null
  );
  const boxesSectionRef = useRef<HTMLDivElement | null>(null);
  const sessionsSectionRef = useRef<HTMLDivElement | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  const calculatorSectionRef = useRef<HTMLDivElement | null>(null);
  const movementsSectionRef = useRef<HTMLDivElement | null>(null);

  const activeCashBoxes = useMemo(() => cashBoxes.filter((box) => box.isActive), [cashBoxes]);
  const openSessions = useMemo(
    () => activeCashBoxes.filter((box) => box.currentSession).map((box) => box.currentSession as PortalCashSession),
    [activeCashBoxes]
  );
  const availableCashBoxes = useMemo(() => activeCashBoxes.filter((box) => !box.currentSession), [activeCashBoxes]);
  const totalExpectedOpen = useMemo(
    () => openSessions.reduce((sum, session) => sum + Number(session.metrics?.expectedAmountCurrent || 0), 0),
    [openSessions]
  );
  const totalSalesOpen = useMemo(
    () => openSessions.reduce((sum, session) => sum + Number(session.metrics?.salesAmount || 0), 0),
    [openSessions]
  );
  const primarySession = openSessions.find((session) => session.id === selectedSessionId) || openSessions[0] || null;
  const todayClosedSessions = useMemo(
    () => recentClosedSessions.filter((session) => isToday(session.closedAt)),
    [recentClosedSessions]
  );
  const recentVisibleOrders = useMemo<VisibleOrder[]>(
    () =>
      openSessions
        .flatMap((session) =>
          (session.metrics?.recentOrders || []).map((order) => ({
            ...order,
            sessionName: session.paymentDestination?.name || "Caja"
          }))
        )
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [openSessions]
  );

  async function refreshCashOverview() {
    const response = await fetch("/api/app/cash-sessions", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(getCashErrorMessage(String(json?.error || ""), "refresh"));
    }

    const nextCashBoxes = Array.isArray(json?.cashBoxes) ? (json.cashBoxes as PortalCashBoxOverview[]) : [];
    setCashBoxes(nextCashBoxes);
    setRecentClosedSessions(Array.isArray(json?.recentClosedSessions) ? (json.recentClosedSessions as PortalCashSession[]) : []);
    setOpenForm((current) => ({
      ...current,
      paymentDestinationId:
        current.paymentDestinationId && nextCashBoxes.some((box) => box.id === current.paymentDestinationId && box.isActive && !box.currentSession)
          ? current.paymentDestinationId
          : nextCashBoxes.find((box) => box.isActive && !box.currentSession)?.id || ""
    }));
    setSelectedSessionId((current) => {
      if (current && nextCashBoxes.some((box) => box.currentSession?.id === current)) return current;
      return nextCashBoxes.find((box) => box.currentSession)?.currentSession?.id || null;
    });
  }

  async function openCashSession() {
    const openingAmount = Number(openForm.openingAmount || 0);
    if (!openForm.paymentDestinationId) {
      toast.error("Selecciona una caja", "Elige una caja disponible para abrir la sesion.");
      return;
    }
    if (!Number.isFinite(openingAmount) || openingAmount < 0) {
      toast.error("Monto inicial invalido", "Indica un monto inicial valido.");
      return;
    }

    setBusyAction("open");
    try {
      const response = await fetch("/api/app/cash-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentDestinationId: openForm.paymentDestinationId,
          openingAmount,
          notes: openForm.notes.trim() || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getCashErrorMessage(String(json?.error || ""), "open"));
      }

      await refreshCashOverview();
      setOpenForm({
        ...EMPTY_OPEN_FORM,
        paymentDestinationId: ""
      });
      toast.success("Sesion abierta");
    } catch (error) {
      toast.error("No se pudo abrir la sesion", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  async function closeCashSession(sessionId: string) {
    const form = closeForms[sessionId] || { cashAmount: "", transferAmount: "", notes: "" };
    const { cashAmount, transferAmount, countedAmount } = getCloseFormTotals(form);
    if (!Number.isFinite(cashAmount) || cashAmount < 0 || !Number.isFinite(transferAmount) || transferAmount < 0) {
      toast.error("Cierre invalido", "Indica montos validos para efectivo y transferencias.");
      return;
    }

    const notes = [
      form.notes.trim() || null,
      transferAmount > 0 ? `Transferencias declaradas: ${formatCurrency(transferAmount)}` : null
    ]
      .filter(Boolean)
      .join("\n");

    setBusyAction(sessionId);
    try {
      const response = await fetch(`/api/app/cash-sessions/${sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashCountedAmount: cashAmount,
          transferCountedAmount: transferAmount,
          totalCountedAmount: countedAmount,
          countedAmount,
          notes: notes || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getCashErrorMessage(String(json?.error || ""), "close"));
      }

      await refreshCashOverview();
      setCloseForms((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      toast.success("Sesion cerrada");
    } catch (error) {
      toast.error("No se pudo cerrar la sesion", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  function scrollToSection(section: CashSectionKey) {
    setActiveSection(section);
    const target =
      section === "boxes"
        ? boxesSectionRef.current
        : section === "sessions"
          ? sessionsSectionRef.current
          : section === "history"
            ? historySectionRef.current
            : section === "movements"
              ? movementsSectionRef.current
              : calculatorSectionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-[linear-gradient(135deg,rgba(8,14,24,0.98),rgba(10,18,30,0.94))] p-5 shadow-[0_20px_52px_rgba(3,8,16,0.22)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Caja operativa</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Controla sesiones, cierres y diferencias en tiempo real.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Esta vista usa las sesiones reales de caja disponibles hoy. Los ingresos visibles surgen de ventas imputadas; los egresos separados todavia no tienen fuente dedicada en esta capa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => scrollToSection("history")}>
            <History className="mr-2 h-4 w-4" />
            Historial de cierres
          </Button>
          <Button type="button" className="rounded-2xl" onClick={() => scrollToSection("boxes")} disabled={readOnly || !availableCashBoxes.length || !backendReady}>
            <UnlockKeyhole className="mr-2 h-4 w-4" />
            Abrir nueva sesion
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Wallet}
          label="Saldo actual en caja"
          value={formatCurrency(totalExpectedOpen)}
          helper={openSessions.length ? `${openSessions.length} sesion${openSessions.length === 1 ? "" : "es"} abierta${openSessions.length === 1 ? "" : "s"}` : "Sin sesiones abiertas ahora"}
          accent="green"
          active={activeSection === "sessions"}
          onClick={() => scrollToSection("sessions")}
        />
        <MetricCard
          icon={Store}
          label="Ingresos del dia"
          value={formatCurrency(totalSalesOpen)}
          helper="Ventas visibles imputadas a sesiones abiertas."
          accent="blue"
          active={activeSection === "sessions"}
          onClick={() => scrollToSection("sessions")}
        />
        <MetricCard
          icon={LockKeyhole}
          label="Egresos del dia"
          value="Sin dato"
          helper="Esta vista todavia no separa egresos manuales por fuente real."
          accent="red"
          active={false}
        />
        <MetricCard
          icon={History}
          label="Cierres del dia"
          value={String(todayClosedSessions.length)}
          helper={todayClosedSessions[0]?.closedAt ? `Ultimo cierre ${formatDate(todayClosedSessions[0].closedAt)}` : "Sin cierres visibles hoy"}
          accent="amber"
          active={activeSection === "history"}
          onClick={() => scrollToSection("history")}
        />
      </section>

      {!backendReady ? (
        <Card className="border-white/8 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle>Caja aun no disponible</CardTitle>
              <CardDescription>Este modulo necesita el backend del portal configurado para operar sesiones reales.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-6">
            {primarySession ? (
              <div ref={sessionsSectionRef} className="scroll-mt-28">
                <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_20px_52px_rgba(3,8,16,0.22)]">
                  <CardHeader action={<Badge variant="success">Abierta</Badge>}>
                    <div>
                      <CardTitle className="text-2xl">Sesion de caja activa</CardTitle>
                      <CardDescription>Resumen ejecutivo de la sesion principal abierta, con cierre real y diferencia visible.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-0">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="space-y-4">
                        <div className="rounded-[24px] border border-white/8 bg-surface/55 p-5">
                          <p className="text-sm text-muted">Caja</p>
                          {openSessions.length > 1 ? (
                            <select
                              className="mt-2 h-11 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                              value={primarySession.id}
                              onChange={(event) => setSelectedSessionId(event.target.value)}
                              disabled={busyAction !== null}
                            >
                              {openSessions.map((session) => (
                                <option key={session.id} value={session.id}>
                                  {session.paymentDestination?.name || "Caja"}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="mt-2 text-xl font-semibold">{primarySession.paymentDestination?.name || "Caja"}</p>
                          )}
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <DetailStat label="Responsable" value={primarySession.openedByNameSnapshot || "Equipo"} />
                            <DetailStat label="Apertura" value={formatDate(primarySession.openedAt)} />
                            <DetailStat label="Monto inicial" value={formatCurrency(primarySession.openingAmount)} />
                            <DetailStat label="Total esperado" value={formatCurrency(primarySession.metrics?.expectedAmountCurrent)} />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <HighlightStat label="Total contado" value={formatCurrency(primarySession.metrics?.expectedAmountCurrent)} tone="green" />
                          <HighlightStat label="Transferencias" value={formatCountedBreakdown(primarySession.transferCountedAmount)} tone="blue" />
                          <HighlightStat label="Tarjetas" value="Sin dato" tone="violet" />
                          <HighlightStat label="Otros medios" value="Sin dato" tone="amber" />
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button type="button" variant="secondary" className="rounded-2xl" disabled>
                            <ArrowDown className="mr-2 h-4 w-4 text-emerald-300" />
                            Ingresar dinero
                          </Button>
                          <Button type="button" variant="secondary" className="rounded-2xl" disabled>
                            <ArrowUp className="mr-2 h-4 w-4 text-red-300" />
                            Retirar dinero
                          </Button>
                          <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => scrollToSection("movements")}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver movimientos
                          </Button>
                          <Button type="button" className="rounded-2xl" onClick={() => void closeCashSession(primarySession.id)} disabled={readOnly || busyAction !== null}>
                            {busyAction === primarySession.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                            Cerrar sesion
                          </Button>
                        </div>
                        <p className="text-xs text-muted">
                          Ingresar dinero y retirar dinero todavia no tienen un flujo manual real separado en esta fuente de caja. Se mantienen visibles, pero no se simulan.
                        </p>
                      </div>
                      <div className="rounded-[26px] border border-brand/20 bg-[radial-gradient(circle_at_top,rgba(176,80,0,0.24),transparent_38%),linear-gradient(180deg,rgba(25,20,16,0.94),rgba(10,16,27,0.98))] p-5">
                        <p className="text-sm font-medium text-brandSoft">Lectura operativa</p>
                        <p className="mt-4 text-3xl font-semibold">{formatCurrency(primarySession.metrics?.salesAmount)}</p>
                        <p className="mt-2 text-sm leading-6 text-muted">Ventas visibles en la sesion principal. El cierre real se calcula con el efectivo y las transferencias que cargues al final del turno.</p>
                        <div className="mt-5">
                          <CashRegisterIllustration />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-card/75 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Cerrar sesion con diferencia visible</p>
                          <p className="mt-1 text-sm text-muted">Usa los mismos handlers actuales para registrar efectivo contado, transferencias y observaciones.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="muted">Esperado {formatCurrency(primarySession.metrics?.expectedAmountCurrent)}</Badge>
                          <Badge variant={differenceVariant(getCloseFormTotals(closeForms[primarySession.id] || { cashAmount: "", transferAmount: "", notes: "" }).countedAmount - Number(primarySession.metrics?.expectedAmountCurrent || 0))}>
                            {formatDifference(getCloseFormTotals(closeForms[primarySession.id] || { cashAmount: "", transferAmount: "", notes: "" }).countedAmount - Number(primarySession.metrics?.expectedAmountCurrent || 0))}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,200px)_minmax(0,200px)_minmax(0,1fr)]">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Efectivo contado</label>
                          <Input
                            value={(closeForms[primarySession.id] || { cashAmount: "", transferAmount: "", notes: "" }).cashAmount}
                            onChange={(event) =>
                              setCloseForms((current) => ({
                                ...current,
                                [primarySession.id]: {
                                  cashAmount: event.target.value,
                                  transferAmount: current[primarySession.id]?.transferAmount || "",
                                  notes: current[primarySession.id]?.notes || ""
                                }
                              }))
                            }
                            inputMode="decimal"
                            placeholder="0"
                            disabled={readOnly || busyAction !== null}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Transferencias</label>
                          <Input
                            value={(closeForms[primarySession.id] || { cashAmount: "", transferAmount: "", notes: "" }).transferAmount}
                            onChange={(event) =>
                              setCloseForms((current) => ({
                                ...current,
                                [primarySession.id]: {
                                  cashAmount: current[primarySession.id]?.cashAmount || "",
                                  transferAmount: event.target.value,
                                  notes: current[primarySession.id]?.notes || ""
                                }
                              }))
                            }
                            inputMode="decimal"
                            placeholder="0"
                            disabled={readOnly || busyAction !== null}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Observaciones</label>
                          <Textarea
                            className="min-h-[92px]"
                            value={(closeForms[primarySession.id] || { cashAmount: "", transferAmount: "", notes: "" }).notes}
                            onChange={(event) =>
                              setCloseForms((current) => ({
                                ...current,
                                [primarySession.id]: {
                                  cashAmount: current[primarySession.id]?.cashAmount || "",
                                  transferAmount: current[primarySession.id]?.transferAmount || "",
                                  notes: event.target.value
                                }
                              }))
                            }
                            placeholder="Diferencia encontrada, retiro, observaciones."
                            disabled={readOnly || busyAction !== null}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div ref={sessionsSectionRef} className="scroll-mt-28">
                <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_20px_52px_rgba(3,8,16,0.22)]">
                  <CardHeader action={<Badge variant="muted">Sin sesiones abiertas</Badge>}>
                    <div>
                      <CardTitle className="text-2xl">Sesion de caja activa</CardTitle>
                      <CardDescription>No hay una sesion abierta ahora. Usa la apertura real de caja para empezar a operar.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <EmptyState title="No hay sesiones activas" description="Abre una caja disponible para empezar a registrar el turno operativo y luego cerrarlo con diferencia visible." />
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={boxesSectionRef} className="scroll-mt-28">
              <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_20px_52px_rgba(3,8,16,0.22)]">
                <CardHeader action={<Badge variant="warning">Apertura</Badge>}>
                  <div>
                    <CardTitle className="text-xl">Abrir nueva sesion</CardTitle>
                    <CardDescription>Elige una caja disponible, define el monto inicial y abre el turno usando el mismo flujo real actual.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {!availableCashBoxes.length ? (
                    <EmptyState title="No hay cajas disponibles para abrir" description="Todas las cajas activas ya tienen sesion abierta o estan inactivas." />
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Caja</label>
                          <select
                            className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                            value={openForm.paymentDestinationId}
                            onChange={(event) => setOpenForm((current) => ({ ...current, paymentDestinationId: event.target.value }))}
                            disabled={readOnly || busyAction !== null}
                          >
                            <option value="">Selecciona una caja</option>
                            {availableCashBoxes.map((box) => (
                              <option key={box.id} value={box.id}>
                                {box.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Monto inicial</label>
                          <Input
                            value={openForm.openingAmount}
                            onChange={(event) => setOpenForm((current) => ({ ...current, openingAmount: event.target.value }))}
                            inputMode="decimal"
                            placeholder="10000"
                            disabled={readOnly || busyAction !== null}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Observaciones</label>
                        <Textarea
                          className="min-h-[104px]"
                          value={openForm.notes}
                          onChange={(event) => setOpenForm((current) => ({ ...current, notes: event.target.value }))}
                          placeholder="Turno manana, cambio inicial, observaciones."
                          disabled={readOnly || busyAction !== null}
                        />
                      </div>
                      <Button type="button" className="rounded-2xl" onClick={() => void openCashSession()} disabled={readOnly || busyAction !== null}>
                        {busyAction === "open" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UnlockKeyhole className="mr-2 h-4 w-4" />}
                        Abrir sesion
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div ref={movementsSectionRef} className="scroll-mt-28">
            <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_20px_52px_rgba(3,8,16,0.22)]">
              <CardHeader action={<Badge variant="muted">{recentVisibleOrders.length} visibles</Badge>}>
                <div>
                  <CardTitle className="text-xl">Movimientos del dia</CardTitle>
                  <CardDescription>Ventas visibles imputadas a las sesiones abiertas, ordenadas por hora de movimiento.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {!recentVisibleOrders.length ? (
                  <EmptyState title="Todavia no hay movimientos visibles" description="Cuando haya ventas imputadas a sesiones abiertas, se van a listar aca automaticamente." />
                ) : (
                  recentVisibleOrders.slice(0, 8).map((order) => (
                    <div key={order.id} className="grid gap-3 rounded-[22px] border border-white/8 bg-surface/55 p-4 md:grid-cols-[110px_minmax(0,1fr)_170px]">
                      <div>
                        <p className="text-sm font-medium">{order.createdAt ? formatDate(order.createdAt) : "Sin hora"}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-emerald-300">Ingreso visible</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{order.customerName}</p>
                        <p className="mt-1 truncate text-sm text-muted">
                          {order.sellerName} · {order.sessionName}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-lg font-semibold">{formatCurrency(order.totalAmount, order.currency)}</p>
                        <p className="mt-1 text-xs text-muted">Pedido imputado a caja</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            </div>

            <div ref={historySectionRef} className="scroll-mt-28">
              <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] shadow-[0_20px_52px_rgba(3,8,16,0.22)]">
                <CardHeader action={<Badge variant="muted">{recentClosedSessions.length} sesiones</Badge>}>
                  <div>
                    <CardTitle className="text-xl">Historial de cierres</CardTitle>
                    <CardDescription>Ultimas sesiones cerradas con efectivo, transferencias, total contado y diferencia del turno.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {!recentClosedSessions.length ? (
                    <EmptyState title="Todavia no hay cierres" description="Cuando cierres una sesion, el resumen del turno va a quedar visible aca." />
                  ) : (
                    recentClosedSessions.map((session) => (
                      <div key={session.id} className="grid gap-3 rounded-[22px] border border-white/8 bg-surface/55 p-4 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_150px_150px]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{session.paymentDestination?.name || "Caja"}</p>
                            <Badge variant="muted">Cerrada</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted">
                            {formatDate(session.openedAt)} → {formatDate(session.closedAt)}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            Abierta por {session.openedByNameSnapshot || "Equipo"} · Cerrada por {session.closedByNameSnapshot || "Equipo"}
                          </p>
                        </div>
                        <DetailStat label="Efectivo" value={formatCountedBreakdown(session.cashCountedAmount)} />
                        <DetailStat label="Transferencias" value={formatCountedBreakdown(session.transferCountedAmount)} />
                        <DetailStat label="Total contado" value={formatCurrency(session.totalCountedAmount ?? session.countedAmount)} />
                        <DetailStat label="Esperado" value={formatCurrency(session.expectedAmount)} />
                        <div className="rounded-2xl border border-[color:var(--border)] bg-card/80 p-4">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Diferencia</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant={differenceVariant(session.differenceAmount)}>{formatDifference(session.differenceAmount)}</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[0_20px_52px_rgba(3,8,16,0.22)]">
              <CardHeader action={<Badge variant="success">{openSessions.length} abierta{openSessions.length === 1 ? "" : "s"}</Badge>}>
                <div>
                  <CardTitle className="text-xl">Sesiones en vivo</CardTitle>
                  <CardDescription>Cajas activas y sesiones operativas visibles desde esta misma vista.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {!cashBoxes.length ? (
                  <EmptyState title="No hay cajas creadas" description="Primero crea un destino de cobro tipo caja desde Cobros." />
                ) : (
                  cashBoxes.map((box) => (
                    <div key={box.id} className={`rounded-[22px] border p-4 ${box.currentSession ? "border-brand/30 bg-[linear-gradient(135deg,rgba(35,24,14,0.62),rgba(14,18,28,0.96))]" : "border-white/8 bg-surface/55"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{box.name}</p>
                          <p className="mt-1 text-sm text-muted">
                            {box.currentSession
                              ? `Apertura ${formatDate(box.currentSession.openedAt)}`
                              : box.isActive
                                ? "Disponible para abrir"
                                : "Inactiva"}
                          </p>
                        </div>
                        <Badge variant={box.currentSession ? "success" : box.isActive ? "muted" : "warning"}>
                          {box.currentSession ? "Abierta" : box.isActive ? "Disponible" : "Inactiva"}
                        </Badge>
                      </div>
                      {box.currentSession ? (
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted">Saldo actual</p>
                            <p className="mt-2 text-xl font-semibold text-emerald-300">{formatCurrency(box.currentSession.metrics?.expectedAmountCurrent)}</p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" className="rounded-2xl" onClick={() => scrollToSection("sessions")}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver sesion
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[0_20px_52px_rgba(3,8,16,0.22)]">
              <CardHeader>
                <div>
                  <CardTitle className="text-xl">Acciones rapidas</CardTitle>
                  <CardDescription>Atajos reales para operar caja sin salir de este modulo.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 pt-0 sm:grid-cols-2">
                <QuickActionButton title="Ingresar dinero" description="Sin flujo manual" icon={ArrowDown} tone="green" disabled />
                <QuickActionButton title="Retirar dinero" description="Sin flujo manual" icon={ArrowUp} tone="red" disabled />
                <QuickActionButton title="Cierre rapido" description="Sesion activa" icon={LockKeyhole} tone="amber" onClick={() => scrollToSection("sessions")} disabled={!openSessions.length} />
                <QuickActionButton title="Imprimir reporte" description="Resumen visual" icon={Printer} tone="blue" onClick={() => window.print()} />
                <QuickActionButton title="Ver arqueo" description="Caja actual" icon={Clock3} tone="violet" onClick={() => scrollToSection("sessions")} disabled={!openSessions.length} />
                <QuickActionButton title="Historial de cierres" description="Ultimos cierres" icon={ListOrdered} tone="amber" onClick={() => scrollToSection("history")} />
                <QuickActionButton title="Calculadora" description="Soporte rapido" icon={Calculator} tone="blue" onClick={() => scrollToSection("calculator")} fullWidth />
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] shadow-[0_20px_52px_rgba(3,8,16,0.22)]">
              <CardHeader>
                <div>
                  <CardTitle className="text-xl">Resumen del dia</CardTitle>
                  <CardDescription>Lectura rapida de lo que hoy esta visible en caja.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <SummaryRow label="Ingresos visibles" value={formatCurrency(totalSalesOpen)} tone="green" />
                <SummaryRow label="Saldo actual abierto" value={formatCurrency(totalExpectedOpen)} tone="green" />
                <SummaryRow label="Cierres de hoy" value={String(todayClosedSessions.length)} tone="neutral" />
                <SummaryRow label="Egresos del dia" value="Sin dato suficiente" tone="red" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div ref={calculatorSectionRef} className="scroll-mt-28">
        <CashCalculator />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  accent = "green",
  active = false,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  accent?: "green" | "blue" | "red" | "amber";
  active?: boolean;
  onClick?: () => void;
}) {
  const accentClasses = {
    green: "border-emerald-500/18 bg-emerald-500/10 text-emerald-300",
    blue: "border-blue-500/18 bg-blue-500/10 text-blue-300",
    red: "border-red-500/18 bg-red-500/10 text-red-300",
    amber: "border-amber-500/18 bg-amber-500/10 text-amber-300"
  } as const;

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card
        className={`border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.94))] transition duration-200 hover:-translate-y-0.5 ${
          active ? "border-brand/30 shadow-[0_0_0_1px_rgba(176,80,0,0.12),0_18px_48px_rgba(176,80,0,0.14)]" : ""
        }`}
      >
        <CardContent className="flex items-start gap-4 p-5">
          <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border ${accentClasses[accent]}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{helper}</p>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-card/80 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function HighlightStat({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "violet" | "amber";
}) {
  const toneClass = {
    green: "text-emerald-300",
    blue: "text-blue-300",
    violet: "text-violet-300",
    amber: "text-amber-300"
  } as const;

  return (
    <div className="rounded-2xl border border-white/8 bg-card/80 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-3 text-xl font-semibold ${toneClass[tone]}`}>{value}</p>
    </div>
  );
}

function QuickActionButton({
  title,
  description,
  icon: Icon,
  onClick,
  disabled = false,
  tone = "blue",
  fullWidth = false
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "green" | "red" | "amber" | "blue" | "violet";
  fullWidth?: boolean;
}) {
  const toneClass = {
    green: "text-emerald-300",
    red: "text-red-300",
    amber: "text-amber-300",
    blue: "text-blue-300",
    violet: "text-violet-300"
  } as const;

  return (
    <button
      type="button"
      className={`flex min-h-[88px] flex-col items-start justify-between rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(14,23,37,0.96),rgba(8,14,24,0.94))] p-4 text-left shadow-[0_14px_30px_rgba(3,8,16,0.24)] transition-colors hover:border-white/14 disabled:cursor-not-allowed disabled:opacity-50 ${fullWidth ? "sm:col-span-2" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-card/80 ${toneClass[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted">{description}</span>
    </button>
  );
}

function CashRegisterIllustration() {
  return (
    <svg viewBox="0 0 220 180" className="w-full max-w-[220px]" aria-hidden="true">
      <defs>
        <linearGradient id="cashStroke" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,191,94,0.95)" />
          <stop offset="100%" stopColor="rgba(255,121,26,0.7)" />
        </linearGradient>
        <linearGradient id="cashGlow" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,143,32,0.95)" />
          <stop offset="100%" stopColor="rgba(176,80,0,0.9)" />
        </linearGradient>
      </defs>
      <rect x="48" y="92" width="120" height="58" rx="10" fill="rgba(9,13,22,0.96)" stroke="url(#cashStroke)" strokeWidth="2" />
      <rect x="60" y="102" width="96" height="30" rx="8" fill="rgba(14,20,31,0.94)" stroke="rgba(255,143,32,0.22)" />
      <rect x="80" y="28" width="60" height="54" rx="10" transform="rotate(12 110 55)" fill="rgba(13,18,29,0.96)" stroke="url(#cashStroke)" strokeWidth="2" />
      <rect x="92" y="40" width="12" height="8" rx="2" fill="url(#cashGlow)" transform="rotate(12 98 44)" />
      <rect x="108" y="44" width="12" height="8" rx="2" fill="url(#cashGlow)" transform="rotate(12 114 48)" />
      <rect x="95" y="56" width="12" height="8" rx="2" fill="url(#cashGlow)" transform="rotate(12 101 60)" />
      <rect x="111" y="60" width="12" height="8" rx="2" fill="url(#cashGlow)" transform="rotate(12 117 64)" />
      <rect x="104" y="84" width="20" height="12" rx="4" fill="rgba(16,20,30,0.98)" stroke="rgba(255,143,32,0.24)" />
      <rect x="96" y="120" width="24" height="6" rx="3" fill="rgba(255,143,32,0.28)" />
      <circle cx="110" cy="134" r="3" fill="url(#cashGlow)" />
      <ellipse cx="110" cy="158" rx="56" ry="12" fill="rgba(255,143,32,0.09)" />
      <ellipse cx="110" cy="158" rx="74" ry="18" fill="none" stroke="rgba(255,143,32,0.14)" />
    </svg>
  );
}

function SummaryRow({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "neutral";
}) {
  const toneClass = tone === "green" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-text";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-surface/55 px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
