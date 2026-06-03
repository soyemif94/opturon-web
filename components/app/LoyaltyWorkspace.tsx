"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Gift,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  WalletCards
} from "lucide-react";
import type { PortalContact, PortalLoyaltyContactDetail, PortalLoyaltyOverview, PortalLoyaltyProgram, PortalLoyaltyReward } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { formatDateTimeLabel, titleCaseLabel } from "@/lib/billing";

type LoyaltyWorkspaceProps = {
  initialOverview: PortalLoyaltyOverview;
  initialContacts: PortalContact[];
  readOnly?: boolean;
};

type RewardFormState = {
  id?: string;
  name: string;
  description: string;
  pointsCost: string;
  active: boolean;
};

const emptyRewardForm: RewardFormState = {
  name: "",
  description: "",
  pointsCost: "",
  active: true
};

export function LoyaltyWorkspace({ initialOverview, initialContacts, readOnly = false }: LoyaltyWorkspaceProps) {
  const [overview, setOverview] = useState(initialOverview);
  const [program, setProgram] = useState<PortalLoyaltyProgram>(initialOverview.program);
  const [rewardForm, setRewardForm] = useState<RewardFormState>(emptyRewardForm);
  const [savingProgram, setSavingProgram] = useState(false);
  const [savingReward, setSavingReward] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(initialContacts[0]?.id || "");
  const [selectedRewardId, setSelectedRewardId] = useState(initialOverview.rewards.find((item) => item.active)?.id || "");
  const [redeemNotes, setRedeemNotes] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [contactLoyalty, setContactLoyalty] = useState<PortalLoyaltyContactDetail | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [showAllRewards, setShowAllRewards] = useState(false);

  async function reloadOverview() {
    const response = await fetch("/api/app/loyalty", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.error || "No se pudo actualizar loyalty.");
    }

    setOverview(json.overview);
    setProgram(json.overview.program);
    setSelectedRewardId((current: string) => {
      if (current && json.overview.rewards.some((item: PortalLoyaltyReward) => item.id === current && item.active)) return current;
      return json.overview.rewards.find((item: PortalLoyaltyReward) => item.active)?.id || "";
    });
  }

  async function loadContactLoyalty(contactId: string) {
    if (!contactId) {
      setContactLoyalty(null);
      return;
    }

    setLoadingContact(true);
    try {
      const response = await fetch(`/api/app/loyalty/contacts/${contactId}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo cargar el saldo del cliente.");
      }

      setContactLoyalty({
        contact: json.contact,
        loyalty: json.loyalty
      });
    } catch (error) {
      setContactLoyalty(null);
      toast.error("No se pudo cargar el cliente", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setLoadingContact(false);
    }
  }

  useEffect(() => {
    void loadContactLoyalty(selectedContactId);
  }, [selectedContactId]);

  async function saveProgram() {
    if (readOnly) return;
    if (!Number.isFinite(Number(program.spendAmount)) || Number(program.spendAmount) <= 0) {
      toast.error("Monto invalido", "El monto base para sumar puntos debe ser mayor a cero.");
      return;
    }
    if (!Number.isInteger(Number(program.pointsAmount)) || Number(program.pointsAmount) <= 0) {
      toast.error("Puntos invalidos", "La cantidad de puntos por tramo debe ser un entero positivo.");
      return;
    }

    setSavingProgram(true);
    try {
      const response = await fetch("/api/app/loyalty/program", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: program.enabled,
          spendAmount: Number(program.spendAmount),
          pointsAmount: Number(program.pointsAmount),
          programText: program.programText,
          redemptionPolicyText: program.redemptionPolicyText
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo guardar la configuracion.");
      }

      setProgram(json.program);
      await reloadOverview();
      toast.success("Programa actualizado", "La regla de puntos ya quedo guardada para este negocio.");
    } catch (error) {
      toast.error("No se pudo guardar loyalty", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSavingProgram(false);
    }
  }

  async function saveReward() {
    if (readOnly) return;
    if (!rewardForm.name.trim()) {
      toast.error("Nombre requerido", "La recompensa necesita un nombre visible para el equipo.");
      return;
    }
    if (!Number.isInteger(Number(rewardForm.pointsCost)) || Number(rewardForm.pointsCost) <= 0) {
      toast.error("Costo invalido", "Define una cantidad de puntos valida para el canje.");
      return;
    }

    setSavingReward(true);
    try {
      const response = await fetch(rewardForm.id ? `/api/app/loyalty/rewards/${rewardForm.id}` : "/api/app/loyalty/rewards", {
        method: rewardForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rewardForm.name.trim(),
          description: rewardForm.description.trim(),
          pointsCost: Number(rewardForm.pointsCost),
          active: rewardForm.active
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo guardar la recompensa.");
      }

      await reloadOverview();
      setRewardForm(emptyRewardForm);
      toast.success(rewardForm.id ? "Recompensa actualizada" : "Recompensa creada");
    } catch (error) {
      toast.error("No se pudo guardar la recompensa", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSavingReward(false);
    }
  }

  async function redeemReward() {
    if (readOnly) return;
    if (!selectedContactId) {
      toast.error("Cliente requerido", "Selecciona un cliente antes de canjear.");
      return;
    }
    if (!selectedRewardId) {
      toast.error("Recompensa requerida", "Selecciona una recompensa activa.");
      return;
    }

    setRedeeming(true);
    try {
      const response = await fetch("/api/app/loyalty/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContactId,
          rewardId: selectedRewardId,
          notes: redeemNotes.trim() || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo canjear la recompensa.");
      }

      setRedeemNotes("");
      await Promise.all([reloadOverview(), loadContactLoyalty(selectedContactId)]);
      toast.success("Canje registrado", "El descuento de puntos ya quedo trazado en el ledger.");
    } catch (error) {
      toast.error("No se pudo canjear", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setRedeeming(false);
    }
  }

  const activeRewards = overview.rewards.filter((item) => item.active);
  const visibleRewards = showAllRewards ? overview.rewards : overview.rewards.slice(0, 3);
  const lastProgramUpdate = program.updatedAt || program.createdAt || null;
  const rankingAvailable = false;
  const rankingCopy = rankingAvailable
    ? "Clientes con mejor saldo y mayor movimiento reciente."
    : "Aun no hay datos suficientes para mostrar un ranking consolidado.";
  const programRuleLabel = `Cada $ ${Number(program.spendAmount || 0).toLocaleString("es-AR")} suma ${Number(program.pointsAmount || 0).toLocaleString("es-AR")} pts`;
  const rewardHeadline = useMemo(() => {
    if (!overview.rewards.length) return "Empieza a cargar recompensas para activar el programa.";
    if (overview.summary.activeRewards === overview.rewards.length) return "Todas tus recompensas estan activas y listas para canjear.";
    return `${overview.summary.activeRewards} de ${overview.rewards.length} recompensas estan activas hoy.`;
  }, [overview.rewards.length, overview.summary.activeRewards]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ImpactCard
          icon={<WalletCards className="h-4 w-4" />}
          label="Clientes con puntos"
          value={String(overview.summary.activeCustomers)}
          helper="Clientes con saldo disponible"
          accent="green"
        />
        <ImpactCard
          icon={<Star className="h-4 w-4" />}
          label="Puntos emitidos"
          value={String(overview.summary.pointsIssued)}
          helper="Puntos acreditados en total"
          accent="blue"
        />
        <ImpactCard
          icon={<Gift className="h-4 w-4" />}
          label="Puntos canjeados"
          value={String(overview.summary.pointsRedeemed)}
          helper="Puntos usados en recompensas"
          accent="violet"
        />
        <ImpactCard
          icon={<RefreshCw className="h-4 w-4" />}
          label="Saldo pendiente"
          value={String(overview.summary.outstandingPoints)}
          helper="Puntos disponibles por canjear"
          accent="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <Card id="recompensas" className="overflow-hidden border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader
            action={
              overview.rewards.length > 3 ? (
                <Button variant="secondary" className="rounded-2xl" onClick={() => setShowAllRewards((current) => !current)}>
                  {showAllRewards ? "Ver menos" : "Ver todas"}
                </Button>
              ) : null
            }
          >
            <div>
              <CardTitle className="text-[1.9rem] leading-none tracking-tight">Recompensas</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6">{rewardHeadline}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {visibleRewards.length ? (
              visibleRewards.map((reward, index) => (
                <button
                  key={reward.id}
                  type="button"
                  disabled={readOnly}
                  onClick={() =>
                    setRewardForm({
                      id: reward.id,
                      name: reward.name,
                      description: reward.description || "",
                      pointsCost: String(reward.pointsCost),
                      active: reward.active
                    })
                  }
                  className="group w-full rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,25,44,0.92),rgba(10,16,29,0.96))] p-4 text-left transition-all hover:border-brand/25 hover:bg-[linear-gradient(180deg,rgba(19,31,54,0.98),rgba(10,16,29,0.98))] disabled:cursor-default"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                      <RewardThumb index={index} name={reward.name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-lg font-semibold text-white">{reward.name}</p>
                          <Badge variant={reward.active ? "success" : "muted"}>{reward.active ? "Activa" : "Inactiva"}</Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {reward.description || "Recompensa disponible para reforzar la recompra y el valor percibido del programa."}
                        </p>
                      </div>
                    </div>
                    <div className="grid min-w-[250px] flex-1 gap-3 sm:grid-cols-3 md:pl-4">
                      <MetricPill label="Puntos requeridos" value={`${reward.pointsCost.toLocaleString("es-AR")} pts`} />
                      <MetricPill label="Disponibilidad" value={reward.active ? "Activa" : "Pausada"} />
                      <MetricPill label="Stock" value="No modelado" />
                    </div>
                    <div className="flex items-center justify-end gap-2 text-muted">
                      <span className="hidden text-sm md:inline-flex">Editar</span>
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        <MoreHorizontal className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(13,21,37,0.88),rgba(9,15,26,0.94))] p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-brand/20 bg-brand/10 text-brandBright">
                  <Gift className="h-7 w-7" />
                </div>
                <p className="mt-5 text-lg font-medium">Todavia no hay recompensas cargadas</p>
                <p className="mt-2 text-sm leading-6 text-muted">Crea la primera recompensa para que el programa tenga una propuesta visible y canjeable.</p>
              </div>
            )}

            {!readOnly ? (
              <Button
                id="reward-editor-anchor"
                variant="secondary"
                className="w-full rounded-2xl border-white/10 bg-white/5 text-base"
                onClick={() => setRewardForm(emptyRewardForm)}
              >
                Crear recompensa
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card id="programa" className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
            <CardHeader>
              <div>
                <CardTitle className="text-2xl">Resumen del programa</CardTitle>
                <CardDescription className="mt-2 leading-6">Configuracion actual, regla de puntos y estado operativo de la fidelizacion.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <SummaryRow label="Estado del programa" value={program.enabled ? "Activo" : "Pausado"} badge={program.enabled ? "Activo" : "Pausado"} badgeVariant={program.enabled ? "success" : "warning"} />
              <SummaryRow label="Cada monto gastado" value={`$ ${Number(program.spendAmount || 0).toLocaleString("es-AR")}`} />
              <SummaryRow label="Puntos acreditados" value={`${Number(program.pointsAmount || 0).toLocaleString("es-AR")} pts`} />
              <SummaryRow label="Regla actual" value={programRuleLabel} />
              <SummaryRow label="Ultima actualizacion" value={lastProgramUpdate ? formatDateTimeLabel(lastProgramUpdate) : "Sin cambios registrados"} />
              <div className="rounded-2xl border border-brand/20 bg-brand/8 px-4 py-3 text-sm text-muted">
                {program.programText || "Cada compra valida suma puntos para futuras recompensas."}
              </div>
              <Button asChild variant="secondary" className="w-full rounded-2xl">
                <a href="#program-config">Ver configuracion completa</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
            <CardHeader
              action={
                <Button asChild variant="secondary" className="rounded-2xl">
                  <a href="#movimientos">Ver todos los movimientos</a>
                </Button>
              }
            >
              <div>
                <CardTitle className="text-2xl">Top clientes</CardTitle>
                <CardDescription className="mt-2 leading-6">{rankingCopy}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(13,21,37,0.88),rgba(9,15,26,0.94))] px-6 py-9 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-muted">
                  <Trophy className="h-7 w-7" />
                </div>
                <p className="mt-5 text-xl font-medium">No hay datos disponibles</p>
                <p className="mt-2 text-sm leading-6 text-muted">Aun no hay clientes con puntos acumulados suficientes para construir un ranking confiable.</p>
                <Button asChild variant="secondary" className="mt-6 rounded-2xl">
                  <a href="#movimientos">Ver ranking completo</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <Card id="movimientos" className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader>
            <div>
              <CardTitle className="text-2xl">Movimientos recientes</CardTitle>
              <CardDescription className="mt-2 leading-6">Ultimos movimientos de puntos registrados en el sistema.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {overview.recentMovements.length ? (
              <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,19,34,0.92),rgba(8,14,25,0.98))]">
                <div className="hidden grid-cols-[1.2fr_0.8fr_1.4fr_0.8fr_0.9fr] gap-4 border-b border-white/8 px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-muted md:grid">
                  <span>Cliente</span>
                  <span>Tipo</span>
                  <span>Descripcion</span>
                  <span>Puntos</span>
                  <span>Fecha</span>
                </div>
                <div className="divide-y divide-white/6">
                  {overview.recentMovements.map((movement) => (
                    <div key={movement.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.2fr_0.8fr_1.4fr_0.8fr_0.9fr] md:items-center">
                      <div>
                        <p className="font-medium text-white">{movement.contact?.name || "Cliente"}</p>
                        <p className="mt-1 text-sm text-muted">{movement.referenceId || "Sin referencia"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={movement.pointsDelta > 0 ? "success" : "warning"}>{movement.pointsDelta > 0 ? `+${movement.pointsDelta}` : movement.pointsDelta}</Badge>
                        <Badge variant="muted">{titleCaseLabel(movement.direction)}</Badge>
                      </div>
                      <div>
                        <p className="font-medium text-white">{movement.reason || "Movimiento de loyalty"}</p>
                        <p className="mt-1 text-sm text-muted">
                          {movement.referenceType ? `${titleCaseLabel(movement.referenceType)} / ` : ""}
                          {movement.contact?.phone || "Sin contacto"}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-white">{movement.points} pts</p>
                      </div>
                      <div>
                        <p className="font-medium text-white">{formatDateTimeLabel(movement.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(13,21,37,0.88),rgba(9,15,26,0.94))] px-6 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-muted">
                  <Sparkles className="h-7 w-7" />
                </div>
                <p className="mt-5 text-xl font-medium">Aun no hay movimientos</p>
                <p className="mt-2 text-sm leading-6 text-muted">Los movimientos de puntos apareceran aqui cuando se registren compras validas o canjes manuales.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card id="reward-editor" className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
            <CardHeader>
              <div>
                <CardTitle className="text-2xl">{rewardForm.id ? "Editar recompensa" : "Crear recompensa"}</CardTitle>
                <CardDescription className="mt-2 leading-6">Alta minima para mantener el catalogo de beneficios alineado al programa actual.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Nombre</p>
                <Input value={rewardForm.name} disabled={readOnly} onChange={(event) => setRewardForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Descripcion</p>
                <Textarea
                  value={rewardForm.description}
                  disabled={readOnly}
                  onChange={(event) => setRewardForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Costo en puntos</p>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={rewardForm.pointsCost}
                  disabled={readOnly}
                  onChange={(event) => setRewardForm((current) => ({ ...current, pointsCost: event.target.value }))}
                />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={rewardForm.active}
                  disabled={readOnly}
                  onChange={(event) => setRewardForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Mantener recompensa activa para nuevos canjes
              </label>
              <div className="flex gap-3">
                <Button className="flex-1 rounded-2xl" onClick={saveReward} disabled={readOnly || savingReward}>
                  {savingReward ? "Guardando..." : rewardForm.id ? "Actualizar recompensa" : "Crear recompensa"}
                </Button>
                {rewardForm.id ? (
                  <Button variant="secondary" className="rounded-2xl" onClick={() => setRewardForm(emptyRewardForm)} disabled={savingReward}>
                    Limpiar
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card id="program-config" className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
            <CardHeader>
              <div>
                <CardTitle className="text-2xl">Configuracion del programa</CardTitle>
                <CardDescription className="mt-2 leading-6">Define la regla de acumulacion y la politica de canje sin salir del panel.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={program.enabled}
                  disabled={readOnly}
                  onChange={(event) => setProgram((current) => ({ ...current, enabled: event.target.checked }))}
                />
                Activar programa de puntos para este negocio
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Cada monto gastado</p>
                  <Input
                    type="number"
                    min="1"
                    value={String(program.spendAmount)}
                    disabled={readOnly}
                    onChange={(event) => setProgram((current) => ({ ...current, spendAmount: Number(event.target.value || 0) }))}
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Puntos acreditados</p>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={String(program.pointsAmount)}
                    disabled={readOnly}
                    onChange={(event) => setProgram((current) => ({ ...current, pointsAmount: Number(event.target.value || 0) }))}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Texto visible</p>
                <Textarea
                  value={program.programText}
                  disabled={readOnly}
                  onChange={(event) => setProgram((current) => ({ ...current, programText: event.target.value }))}
                />
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Politica de canje</p>
                <Textarea
                  value={program.redemptionPolicyText}
                  disabled={readOnly}
                  onChange={(event) => setProgram((current) => ({ ...current, redemptionPolicyText: event.target.value }))}
                />
              </div>

              <div className="rounded-2xl border border-brand/20 bg-brand/8 px-4 py-3">
                <p className="text-sm text-muted">
                  Regla actual:
                  <span className="ml-2 font-medium text-text">{programRuleLabel}</span>
                </p>
              </div>

              <Button className="w-full rounded-2xl" onClick={saveProgram} disabled={readOnly || savingProgram}>
                {savingProgram ? "Guardando..." : "Guardar configuracion"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
            <CardHeader>
              <div>
                <CardTitle className="text-2xl">Canje manual</CardTitle>
                <CardDescription className="mt-2 leading-6">Permite operar un canje puntual con trazabilidad completa sobre el ledger actual.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Cliente</p>
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm"
                  value={selectedContactId}
                  disabled={readOnly || !initialContacts.length}
                  onChange={(event) => setSelectedContactId(event.target.value)}
                >
                  <option value="">Selecciona un cliente</option>
                  {initialContacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Recompensa</p>
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm"
                  value={selectedRewardId}
                  disabled={readOnly || !activeRewards.length}
                  onChange={(event) => setSelectedRewardId(event.target.value)}
                >
                  <option value="">Selecciona una recompensa</option>
                  {activeRewards.map((reward) => (
                    <option key={reward.id} value={reward.id}>
                      {reward.name} - {reward.pointsCost} pts
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Nota interna</p>
                <Textarea value={redeemNotes} disabled={readOnly} onChange={(event) => setRedeemNotes(event.target.value)} />
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,25,44,0.9),rgba(10,16,29,0.96))] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brandBright">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Saldo del cliente</p>
                    {loadingContact ? (
                      <p className="mt-1 text-sm text-muted">Cargando puntos...</p>
                    ) : contactLoyalty ? (
                      <p className="mt-1 text-lg font-semibold text-white">{contactLoyalty.loyalty.summary.currentPoints} pts</p>
                    ) : (
                      <p className="mt-1 text-sm text-muted">Selecciona un cliente para ver su saldo actual.</p>
                    )}
                  </div>
                </div>
                {contactLoyalty ? (
                  <p className="mt-3 text-sm text-muted">
                    Acumulados {contactLoyalty.loyalty.summary.totalEarned} / Canjeados {contactLoyalty.loyalty.summary.totalRedeemed}
                  </p>
                ) : null}
              </div>

              <Button className="w-full rounded-2xl" onClick={redeemReward} disabled={readOnly || redeeming || !selectedContactId || !selectedRewardId}>
                {redeeming ? "Canjeando..." : "Canjear recompensa"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ImpactCard({
  icon,
  label,
  value,
  helper,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
  accent: "green" | "blue" | "violet" | "amber";
}) {
  const accentClasses = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    violet: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300"
  } satisfies Record<string, string>;

  return (
    <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
            <p className="mt-2 text-sm text-muted">{helper}</p>
          </div>
          <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${accentClasses[accent]}`}>
            {icon}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RewardThumb({ index, name }: { index: number; name: string }) {
  const skins = [
    "from-amber-100 via-orange-100 to-amber-50 text-amber-950",
    "from-slate-200 via-zinc-100 to-slate-50 text-slate-950",
    "from-emerald-100 via-teal-100 to-cyan-50 text-emerald-950"
  ];

  return (
    <div
      className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/12 bg-gradient-to-br ${skins[index % skins.length]} shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]`}
    >
      <div className="flex flex-col items-center gap-1">
        <Gift className="h-6 w-6" />
        <span className="max-w-[56px] truncate text-[11px] font-semibold uppercase tracking-[0.16em]">{name.slice(0, 6)}</span>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  badge,
  badgeVariant
}: {
  label: string;
  value: string;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger" | "muted" | "outline";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
      <p className="text-sm text-muted">{label}</p>
      <div className="flex items-center gap-2 text-right">
        <p className="text-sm font-medium text-white">{value}</p>
        {badge ? <Badge variant={badgeVariant || "muted"}>{badge}</Badge> : null}
      </div>
    </div>
  );
}
