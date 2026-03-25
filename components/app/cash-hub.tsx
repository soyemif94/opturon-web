"use client";

import { useMemo, useState } from "react";
import { Loader2, LockKeyhole, Store, UnlockKeyhole, Wallet } from "lucide-react";
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

type OpenFormState = {
  paymentDestinationId: string;
  openingAmount: string;
  notes: string;
};

type CloseFormState = Record<string, { countedAmount: string; notes: string }>;

const EMPTY_OPEN_FORM: OpenFormState = {
  paymentDestinationId: "",
  openingAmount: "",
  notes: ""
};

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

  const activeCashBoxes = useMemo(() => cashBoxes.filter((box) => box.isActive), [cashBoxes]);
  const openSessions = useMemo(
    () => activeCashBoxes.filter((box) => box.currentSession).map((box) => box.currentSession as PortalCashSession),
    [activeCashBoxes]
  );
  const availableCashBoxes = useMemo(
    () => activeCashBoxes.filter((box) => !box.currentSession),
    [activeCashBoxes]
  );

  async function refreshCashOverview() {
    const response = await fetch("/api/app/cash-sessions", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(String(json?.error || "No se pudo refrescar la caja."));
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
  }

  async function openCashSession() {
    const openingAmount = Number(openForm.openingAmount || 0);
    if (!openForm.paymentDestinationId) {
      toast.error("Selecciona una caja", "Elige una caja activa para abrir el turno.");
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
        throw new Error(String(json?.error || "No se pudo abrir la caja."));
      }

      await refreshCashOverview();
      setOpenForm({
        ...EMPTY_OPEN_FORM,
        paymentDestinationId: ""
      });
      toast.success("Caja abierta");
    } catch (error) {
      toast.error("No se pudo abrir la caja", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  async function closeCashSession(sessionId: string) {
    const form = closeForms[sessionId] || { countedAmount: "", notes: "" };
    const countedAmount = Number(form.countedAmount || 0);
    if (!Number.isFinite(countedAmount) || countedAmount < 0) {
      toast.error("Monto contado invalido", "Indica un monto contado valido.");
      return;
    }

    setBusyAction(sessionId);
    try {
      const response = await fetch(`/api/app/cash-sessions/${sessionId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countedAmount,
          notes: form.notes.trim() || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo cerrar la caja."));
      }

      await refreshCashOverview();
      setCloseForms((current) => {
        const next = { ...current };
        delete next[sessionId];
        return next;
      });
      toast.success("Caja cerrada");
    } catch (error) {
      toast.error("No se pudo cerrar la caja", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setBusyAction(null);
    }
  }

  const totalExpectedOpen = openSessions.reduce(
    (sum, session) => sum + Number(session.metrics?.expectedAmountCurrent || 0),
    0
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Store} label="Cajas activas" value={String(activeCashBoxes.length)} helper="Destinos tipo caja disponibles." />
        <MetricCard icon={UnlockKeyhole} label="Sesiones abiertas" value={String(openSessions.length)} helper="Turnos de caja en curso." />
        <MetricCard icon={Wallet} label="Esperado en cajas" value={formatCurrency(totalExpectedOpen)} helper="Monto esperado actual en sesiones abiertas." />
        <MetricCard icon={LockKeyhole} label="Sesiones cerradas" value={String(recentClosedSessions.length)} helper="Ultimos cierres visibles en el historial." />
      </section>

      {!backendReady ? (
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle>Caja aun no disponible</CardTitle>
              <CardDescription>Este modulo necesita el backend del portal configurado para operar sesiones reales.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Apertura</Badge>}>
            <div>
              <CardTitle className="text-xl">Abrir caja</CardTitle>
              <CardDescription>Solo se pueden abrir cajas activas sin una sesion en curso.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {!availableCashBoxes.length ? (
              <EmptyState
                title="No hay cajas disponibles para abrir"
                description="Crea una caja activa o cierra una sesion abierta para volver a iniciar un turno."
              />
            ) : (
              <>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nota opcional</label>
                  <Textarea
                    className="min-h-[104px]"
                    value={openForm.notes}
                    onChange={(event) => setOpenForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Turno manana, cambio inicial, observaciones."
                    disabled={readOnly || busyAction !== null}
                  />
                </div>
                <Button onClick={() => void openCashSession()} disabled={readOnly || busyAction !== null}>
                  {busyAction === "open" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UnlockKeyhole className="mr-2 h-4 w-4" />}
                  Abrir caja
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">{cashBoxes.length} cajas</Badge>}>
            <div>
              <CardTitle className="text-xl">Estado de cajas</CardTitle>
              <CardDescription>Lectura rapida de cajas disponibles, abiertas o sin sesion operativa.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {!cashBoxes.length ? (
              <EmptyState
                title="Todavia no hay cajas creadas"
                description="Primero crea un destino de cobro tipo caja desde Cobros."
              />
            ) : (
              cashBoxes.map((box) => (
                <div
                  key={box.id}
                  className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-surface/60 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{box.name}</p>
                    <p className="text-sm text-muted">
                      {box.isActive ? "Activa" : "Inactiva"} · {box.currentSession ? "Sesion abierta" : "Sin sesion"}
                    </p>
                  </div>
                  <Badge variant={box.currentSession ? "success" : box.isActive ? "muted" : "warning"}>
                    {box.currentSession ? "Abierta" : box.isActive ? "Disponible" : "Inactiva"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="success">{openSessions.length} abiertas</Badge>}>
          <div>
            <CardTitle className="text-xl">Sesiones abiertas</CardTitle>
            <CardDescription>Durante el turno se calcula esperado actual como monto inicial + pedidos pagados imputados a esa caja.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {!openSessions.length ? (
            <EmptyState
              title="No hay sesiones abiertas"
              description="Abre una caja para empezar a controlar esperado, ventas imputadas y cierre."
            />
          ) : (
            openSessions.map((session) => {
              const closeForm = closeForms[session.id] || { countedAmount: "", notes: "" };
              return (
                <div key={session.id} className="rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold">{session.paymentDestination?.name || "Caja"}</p>
                        <Badge variant="success">Abierta</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Abierta por {session.openedByNameSnapshot || "Equipo"} · {formatDate(session.openedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted">Esperado actual</p>
                      <p className="text-xl font-semibold">{formatCurrency(session.metrics?.expectedAmountCurrent)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <DetailStat label="Monto inicial" value={formatCurrency(session.openingAmount)} />
                    <DetailStat label="Ventas imputadas" value={formatCurrency(session.metrics?.salesAmount)} />
                    <DetailStat label="Pedidos contados" value={String(session.metrics?.ordersCount || 0)} />
                    <DetailStat label="Esperado" value={formatCurrency(session.metrics?.expectedAmountCurrent)} />
                  </div>

                  {session.metrics?.recentOrders?.length ? (
                    <div className="mt-4 rounded-[22px] border border-[color:var(--border)] bg-card/80 p-4">
                      <p className="text-sm font-semibold">Ventas que estan contando</p>
                      <div className="mt-3 space-y-3">
                        {session.metrics.recentOrders.map((order) => (
                          <div key={order.id} className="flex items-start justify-between gap-3 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{order.customerName}</p>
                              <p className="mt-1 truncate text-muted">
                                {order.sellerName} · {formatDate(order.createdAt)}
                              </p>
                            </div>
                            <p className="font-medium">{formatCurrency(order.totalAmount, order.currency)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted">Todavia no hay pedidos pagados imputados a esta caja dentro de la sesion.</p>
                  )}

                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Monto contado</label>
                      <Input
                        value={closeForm.countedAmount}
                        onChange={(event) =>
                          setCloseForms((current) => ({
                            ...current,
                            [session.id]: {
                              countedAmount: event.target.value,
                              notes: current[session.id]?.notes || ""
                            }
                          }))
                        }
                        inputMode="decimal"
                        placeholder="0"
                        disabled={readOnly || busyAction !== null}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nota de cierre</label>
                      <Textarea
                        className="min-h-[92px]"
                        value={closeForm.notes}
                        onChange={(event) =>
                          setCloseForms((current) => ({
                            ...current,
                            [session.id]: {
                              countedAmount: current[session.id]?.countedAmount || "",
                              notes: event.target.value
                            }
                          }))
                        }
                        placeholder="Diferencia encontrada, retiro, observaciones."
                        disabled={readOnly || busyAction !== null}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => void closeCashSession(session.id)} disabled={readOnly || busyAction !== null}>
                        {busyAction === session.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                        Cerrar caja
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="muted">{recentClosedSessions.length} sesiones</Badge>}>
          <div>
            <CardTitle className="text-xl">Historico de cierres</CardTitle>
            <CardDescription>Ultimas sesiones cerradas con esperado, contado y diferencia de caja.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {!recentClosedSessions.length ? (
            <EmptyState
              title="Todavia no hay cierres"
              description="Cuando cierres una caja, el historico va a quedar visible aca."
            />
          ) : (
            recentClosedSessions.map((session) => (
              <div
                key={session.id}
                className="grid gap-3 rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px]"
              >
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
                <DetailStat label="Esperado" value={formatCurrency(session.expectedAmount)} />
                <DetailStat label="Contado" value={formatCurrency(session.countedAmount)} />
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

      <CashCalculator />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="flex items-start gap-4 p-5">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
          <Icon className="h-5 w-5 text-brandBright" />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
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
