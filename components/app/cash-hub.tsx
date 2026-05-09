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

type CloseFormState = Record<
  string,
  {
    cashAmount: string;
    transferAmount: string;
    notes: string;
  }
>;

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

  const totalExpectedOpen = openSessions.reduce(
    (sum, session) => sum + Number(session.metrics?.expectedAmountCurrent || 0),
    0
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Store} label="Cajas activas" value={String(activeCashBoxes.length)} helper="Cajas fisicas habilitadas para operar." />
        <MetricCard icon={UnlockKeyhole} label="Sesiones abiertas" value={String(openSessions.length)} helper="Turnos de caja en curso." />
        <MetricCard icon={Wallet} label="Esperado en sesion" value={formatCurrency(totalExpectedOpen)} helper="Suma esperada de todas las sesiones abiertas." />
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
              <CardTitle className="text-xl">Abrir sesion de caja</CardTitle>
              <CardDescription>Elige una caja disponible, define monto inicial y abre el turno operativo.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {!availableCashBoxes.length ? (
              <EmptyState
                title="No hay cajas disponibles para abrir"
                description="Todas las cajas activas ya tienen una sesion abierta o estan inactivas."
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
                  <label className="text-sm font-medium">Observaciones</label>
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
                  Abrir sesion
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">{cashBoxes.length} cajas</Badge>}>
            <div>
              <CardTitle className="text-xl">Estado de cajas</CardTitle>
              <CardDescription>Las cajas fisicas pueden estar disponibles, con sesion abierta o inactivas.</CardDescription>
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
                      {box.currentSession
                        ? `Sesion abierta desde ${formatDate(box.currentSession.openedAt)}`
                        : box.isActive
                          ? "Disponible"
                          : "Inactiva"}
                    </p>
                  </div>
                  <Badge variant={box.currentSession ? "success" : box.isActive ? "muted" : "warning"}>
                    {box.currentSession ? "Sesion abierta" : box.isActive ? "Disponible" : "Inactiva"}
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
            <CardDescription>Cada sesion abierta muestra apertura, esperado actual y cierre del turno.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {!openSessions.length ? (
            <EmptyState
              title="No hay sesiones abiertas"
              description="Abre una sesion para empezar a operar y luego cerrarla con diferencia visible."
            />
          ) : (
            openSessions.map((session) => {
              const closeForm = closeForms[session.id] || { cashAmount: "", transferAmount: "", notes: "" };
              const { countedAmount } = getCloseFormTotals(closeForm);
              const expectedAmount = Number(session.metrics?.expectedAmountCurrent || 0);
              const closeDifference = countedAmount - expectedAmount;

              return (
                <div key={session.id} className="rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold">{session.paymentDestination?.name || "Caja"}</p>
                        <Badge variant="success">Sesion abierta</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Apertura: {formatDate(session.openedAt)} · Monto inicial: {formatCurrency(session.openingAmount)}
                      </p>
                      <p className="mt-1 text-sm text-muted">Responsable: {session.openedByNameSnapshot || "Equipo"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted">Total esperado del turno</p>
                      <p className="text-xl font-semibold">{formatCurrency(expectedAmount)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <DetailStat label="Monto inicial" value={formatCurrency(session.openingAmount)} />
                    <DetailStat label="Ventas imputadas" value={formatCurrency(session.metrics?.salesAmount)} />
                    <DetailStat label="Pedidos contados" value={String(session.metrics?.ordersCount || 0)} />
                    <DetailStat label="Esperado" value={formatCurrency(expectedAmount)} />
                  </div>

                  {session.metrics?.recentOrders?.length ? (
                    <div className="mt-4 rounded-[22px] border border-[color:var(--border)] bg-card/80 p-4">
                      <p className="text-sm font-semibold">Movimientos imputados a esta sesion</p>
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
                    <p className="mt-4 text-sm text-muted">Todavia no hay pedidos pagados imputados a esta sesion.</p>
                  )}

                  <div className="mt-4 rounded-[22px] border border-[color:var(--border)] bg-card/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Cerrar sesion</p>
                        <p className="text-sm text-muted">Carga lo contado del turno y guarda la diferencia del cierre.</p>
                      </div>
                      <Button onClick={() => void closeCashSession(session.id)} disabled={readOnly || busyAction !== null}>
                        {busyAction === session.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                        Cerrar sesion
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <DetailStat label="Esperado" value={formatCurrency(expectedAmount)} />
                      <DetailStat label="Contado total" value={formatCurrency(countedAmount)} />
                      <div className="rounded-2xl border border-[color:var(--border)] bg-card/80 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Diferencia</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={differenceVariant(closeDifference)}>{formatDifference(closeDifference)}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,200px)_minmax(0,200px)_minmax(0,1fr)]">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Efectivo contado</label>
                        <Input
                          value={closeForm.cashAmount}
                          onChange={(event) =>
                            setCloseForms((current) => ({
                              ...current,
                              [session.id]: {
                                cashAmount: event.target.value,
                                transferAmount: current[session.id]?.transferAmount || "",
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
                        <label className="text-sm font-medium">Transferencias</label>
                        <Input
                          value={closeForm.transferAmount}
                          onChange={(event) =>
                            setCloseForms((current) => ({
                              ...current,
                              [session.id]: {
                                cashAmount: current[session.id]?.cashAmount || "",
                                transferAmount: event.target.value,
                                notes: current[session.id]?.notes || ""
                              }
                            }))
                          }
                          inputMode="decimal"
                          placeholder="0"
                          disabled={readOnly || busyAction !== null}
                        />
                        <p className="text-xs text-muted">Se suma al total contado y queda asentado en observaciones.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Observaciones</label>
                        <Textarea
                          className="min-h-[92px]"
                          value={closeForm.notes}
                          onChange={(event) =>
                            setCloseForms((current) => ({
                              ...current,
                              [session.id]: {
                                cashAmount: current[session.id]?.cashAmount || "",
                                transferAmount: current[session.id]?.transferAmount || "",
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
            <CardDescription>Ultimas sesiones cerradas con esperado, contado y diferencia del turno.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {!recentClosedSessions.length ? (
            <EmptyState
              title="Todavia no hay cierres"
              description="Cuando cierres una sesion, el resumen del turno va a quedar visible aca."
            />
          ) : (
            recentClosedSessions.map((session) => (
              <div
                key={session.id}
                className="grid gap-3 rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4 lg:grid-cols-[minmax(0,1fr)_140px_140px_150px_150px_150px]"
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
