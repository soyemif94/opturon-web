"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { ArrowLeft, Gift, ImagePlus, RefreshCw, Star, Trash2, WalletCards } from "lucide-react";
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
  stockQty: string;
  active: boolean;
  image: PortalLoyaltyReward["image"];
};

const emptyRewardForm: RewardFormState = {
  name: "",
  description: "",
  pointsCost: "",
  stockQty: "0",
  active: true,
  image: null
};

function hydrateRewardForm(reward?: PortalLoyaltyReward | null): RewardFormState {
  if (!reward) return emptyRewardForm;
  return {
    id: reward.id,
    name: reward.name,
    description: reward.description || "",
    pointsCost: String(reward.pointsCost),
    stockQty: String(reward.stockQty ?? 0),
    active: reward.active,
    image: reward.image || null
  };
}

export function LoyaltyWorkspace({ initialOverview, initialContacts, readOnly = false }: LoyaltyWorkspaceProps) {
  const [overview, setOverview] = useState(initialOverview);
  const [program, setProgram] = useState<PortalLoyaltyProgram>(initialOverview.program);
  const [rewardForm, setRewardForm] = useState<RewardFormState>(emptyRewardForm);
  const [rewardEditorMode, setRewardEditorMode] = useState<"create" | "edit" | null>(null);
  const [savingProgram, setSavingProgram] = useState(false);
  const [savingReward, setSavingReward] = useState(false);
  const [uploadingRewardImage, setUploadingRewardImage] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(initialContacts[0]?.id || "");
  const [selectedRewardId, setSelectedRewardId] = useState(initialOverview.rewards.find((item) => item.active)?.id || "");
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [redeemNotes, setRedeemNotes] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [contactLoyalty, setContactLoyalty] = useState<PortalLoyaltyContactDetail | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);

  async function reloadOverview(preferredRewardId?: string | null) {
    const response = await fetch("/api/app/loyalty", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.error || "No se pudo actualizar loyalty.");
    }

    const nextOverview = json.overview as PortalLoyaltyOverview;
    setOverview(nextOverview);
    setProgram(nextOverview.program);
    setSelectedRewardId((current: string) => {
      if (current && nextOverview.rewards.some((item) => item.id === current && item.active)) return current;
      return nextOverview.rewards.find((item) => item.active)?.id || "";
    });

    if (preferredRewardId) {
      const preferredReward = nextOverview.rewards.find((item) => item.id === preferredRewardId) || null;
      if (preferredReward) {
        setEditingRewardId(preferredReward.id);
        setRewardForm(hydrateRewardForm(preferredReward));
      }
    }

    return nextOverview;
  }

  function startNewReward() {
    setRewardEditorMode("create");
    setEditingRewardId(null);
    setRewardForm(emptyRewardForm);
  }

  function selectRewardForEdit(reward: PortalLoyaltyReward) {
    setRewardEditorMode("edit");
    setEditingRewardId(reward.id);
    setRewardForm(hydrateRewardForm(reward));
  }

  function closeRewardEditor() {
    setRewardEditorMode(null);
    setEditingRewardId(null);
    setRewardForm(emptyRewardForm);
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
      await reloadOverview(editingRewardId);
      toast.success("Programa actualizado", "La regla de puntos ya quedo guardada para este negocio.");
    } catch (error) {
      toast.error("No se pudo guardar loyalty", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSavingProgram(false);
    }
  }

  async function uploadRewardImage(file: File) {
    if (readOnly) return;

    setUploadingRewardImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/app/loyalty/rewards/image-upload", {
        method: "POST",
        body: formData
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo subir la imagen.");
      }

      setRewardForm((current) => ({
        ...current,
        image: json.image || null
      }));
      toast.success("Imagen cargada", "La recompensa ya tiene preview lista para guardar.");
    } catch (error) {
      toast.error("No se pudo subir la imagen", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setUploadingRewardImage(false);
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
    if (!Number.isInteger(Number(rewardForm.stockQty)) || Number(rewardForm.stockQty) < 0) {
      toast.error("Stock invalido", "El stock debe ser cero o mayor.");
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
          stockQty: Number(rewardForm.stockQty),
          image: rewardForm.image,
          active: rewardForm.active
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo guardar la recompensa.");
      }

      setRewardEditorMode("edit");
      const savedReward = json.reward as PortalLoyaltyReward;
      setEditingRewardId(savedReward.id);
      setRewardForm(hydrateRewardForm(savedReward));
      await reloadOverview(savedReward.id);
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
      await Promise.all([reloadOverview(editingRewardId), loadContactLoyalty(selectedContactId)]);
      toast.success("Canje registrado", "El descuento de puntos ya quedo trazado en el ledger.");
    } catch (error) {
      toast.error("No se pudo canjear", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setRedeeming(false);
    }
  }

  const activeRewards = overview.rewards.filter((item) => item.active);
  const rewardEditorOpen = rewardEditorMode !== null;
  const editingReward = editingRewardId ? overview.rewards.find((item) => item.id === editingRewardId) || null : null;
  const rewardTitle = rewardEditorMode === "create" ? "Nueva recompensa" : editingReward?.name || rewardForm.name || "Recompensa";
  const rewardStatusLabel = rewardForm.active ? "Activa" : "Inactiva";
  const rewardStatusVariant = rewardForm.active ? "success" : "muted";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ImpactCard icon={<WalletCards className="h-4 w-4" />} label="Clientes con puntos" value={String(overview.summary.activeCustomers)} helper="Clientes con saldo disponible hoy." />
        <ImpactCard icon={<Star className="h-4 w-4" />} label="Puntos emitidos" value={String(overview.summary.pointsIssued)} helper="Puntos acreditados por compras registradas." />
        <ImpactCard icon={<Gift className="h-4 w-4" />} label="Puntos canjeados" value={String(overview.summary.pointsRedeemed)} helper="Consumo real de recompensas desde el panel." />
        <ImpactCard icon={<RefreshCw className="h-4 w-4" />} label="Saldo pendiente" value={String(overview.summary.outstandingPoints)} helper="Puntos que siguen disponibles para futuras recompensas." />
      </section>

      {rewardEditorOpen ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <Card className="border-white/6 bg-card/90">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" className="gap-2 px-0 text-muted hover:text-text" onClick={closeRewardEditor}>
                  <ArrowLeft className="h-4 w-4" />
                  Volver a fidelizacion
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Edicion de recompensa</Badge>
                  <Badge variant={rewardStatusVariant}>{rewardStatusLabel}</Badge>
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl">{rewardTitle}</CardTitle>
                <CardDescription className="mt-2">
                  Ajusta imagen, nombre, descripcion, costo y stock sin perder el contexto premium del modulo.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <RewardImagePreview image={rewardForm.image} title={rewardForm.name || "Recompensa"} large />

              {!readOnly ? (
                <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                  <label className="block text-xs uppercase tracking-[0.16em] text-muted">Imagen</label>
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--border)] bg-bg px-4 py-2 text-sm">
                      <ImagePlus className="h-4 w-4" />
                      {uploadingRewardImage ? "Subiendo..." : rewardForm.image ? "Cambiar imagen" : "Cargar imagen"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingRewardImage}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadRewardImage(file);
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {rewardForm.image ? (
                      <Button variant="ghost" onClick={() => setRewardForm((current) => ({ ...current, image: null }))} disabled={uploadingRewardImage}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar imagen
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted">Formatos permitidos: JPG, PNG o WEBP. Maximo 4 MB.</p>
                </div>
              ) : null}

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
              <div className="grid gap-4 md:grid-cols-2">
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
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Stock disponible</p>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={rewardForm.stockQty}
                    disabled={readOnly}
                    onChange={(event) => setRewardForm((current) => ({ ...current, stockQty: event.target.value }))}
                  />
                </div>
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
              <div className="flex flex-wrap gap-3">
                <Button className="flex-1 sm:flex-none" onClick={saveReward} disabled={readOnly || savingReward || uploadingRewardImage}>
                  {savingReward ? "Guardando..." : rewardForm.id ? "Guardar cambios" : "Crear recompensa"}
                </Button>
                {!readOnly ? (
                  <Button variant="secondary" onClick={closeRewardEditor} disabled={savingReward}>
                    {rewardForm.id ? "Volver al listado" : "Cancelar"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/6 bg-card/90">
              <CardHeader>
                <div>
                  <CardTitle className="text-lg">Vista previa</CardTitle>
                  <CardDescription>Asi se ve la recompensa dentro del catalogo de fidelizacion.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                  <div className="flex items-start gap-4">
                    <RewardImagePreview image={rewardForm.image} title={rewardForm.name || "Recompensa"} compact />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{rewardForm.name || "Nombre de recompensa"}</p>
                        <Badge variant={rewardStatusVariant}>{rewardStatusLabel}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted">{rewardForm.description || "Descripcion breve para anticipar el valor del canje."}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                  <SummaryPill label="Puntos requeridos" value={rewardForm.pointsCost ? `${rewardForm.pointsCost} pts` : "Pendiente"} />
                  <SummaryPill label="Stock" value={`${rewardForm.stockQty || "0"} unidades`} />
                  <SummaryPill label="Estado" value={rewardStatusLabel} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/6 bg-card/90">
              <CardHeader>
                <div>
                  <CardTitle className="text-lg">Ayuda rapida</CardTitle>
                  <CardDescription>Checklist breve para editar con menos scroll y mejor contexto.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm text-muted">
                <p>Usa una imagen clara y reconocible para que el equipo identifique la recompensa al instante.</p>
                <p>Deja el stock en `0` solo si quieres bloquear nuevos canjes manteniendo el registro visible.</p>
                <p>Al guardar, el panel vuelve a usar la misma persistencia real que ya estaba activa para rewards.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <Card className="border-white/6 bg-card/90">
              <CardHeader
                action={
                  <Badge variant={program.enabled ? "success" : "warning"}>{program.enabled ? "Programa activo" : "Programa pausado"}</Badge>
                }
              >
                <div>
                  <CardTitle className="text-xl">Configuracion del programa</CardTitle>
                  <CardDescription>Define una regla simple por negocio para acumular puntos por compra acreditada.</CardDescription>
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

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-brand/8 px-4 py-3">
                  <p className="text-sm text-muted">
                    Regla actual:
                    <span className="ml-2 font-medium text-text">
                      Cada {Number(program.spendAmount || 0).toLocaleString("es-AR")} de consumo acredita {Number(program.pointsAmount || 0)} puntos
                    </span>
                  </p>
                  <Button onClick={saveProgram} disabled={readOnly || savingProgram}>
                    {savingProgram ? "Guardando..." : "Guardar configuracion"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/6 bg-card/90">
              <CardHeader>
                <div>
                  <CardTitle className="text-xl">Canje manual</CardTitle>
                  <CardDescription>El equipo puede canjear puntos desde el panel con trazabilidad completa y saldo actualizado.</CardDescription>
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

                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Saldo del cliente</p>
                  {loadingContact ? (
                    <p className="mt-3 text-sm text-muted">Cargando puntos...</p>
                  ) : contactLoyalty ? (
                    <>
                      <p className="mt-3 text-2xl font-semibold">{contactLoyalty.loyalty.summary.currentPoints} pts</p>
                      <p className="mt-2 text-sm text-muted">
                        Acumulados {contactLoyalty.loyalty.summary.totalEarned} / Canjeados {contactLoyalty.loyalty.summary.totalRedeemed}
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-muted">Selecciona un cliente para ver su saldo actual.</p>
                  )}
                </div>

                <Button className="w-full" onClick={redeemReward} disabled={readOnly || redeeming || !selectedContactId || !selectedRewardId}>
                  {redeeming ? "Canjeando..." : "Canjear recompensa"}
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              !readOnly ? (
                <Button variant="secondary" onClick={startNewReward}>
                  Nueva recompensa
                </Button>
              ) : null
            }
          >
            <div>
              <CardTitle className="text-xl">Recompensas</CardTitle>
              <CardDescription>Catalogo premium por tenant para beneficios, descuentos o extras de servicio con stock e imagen.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {overview.rewards.length ? (
              overview.rewards.map((reward) => {
                const isEditing = editingRewardId === reward.id;
                return (
                  <div
                    key={reward.id}
                    className={`rounded-[24px] border p-4 transition-colors ${isEditing ? "border-brand/40 bg-brand/8" : "border-[color:var(--border)] bg-surface/55"}`}
                  >
                    <div className="flex items-start gap-4">
                      <RewardImagePreview image={reward.image} title={reward.name} compact />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{reward.name}</p>
                          <Badge variant={reward.active ? "success" : "muted"}>{reward.active ? "Activa" : "Inactiva"}</Badge>
                          <Badge variant={reward.stockQty > 0 ? "warning" : "danger"}>{reward.stockQty > 0 ? `${reward.stockQty} disponibles` : "Sin stock"}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted">{reward.description || "Sin descripcion comercial adicional."}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <Badge variant="warning">{reward.pointsCost} pts</Badge>
                          {!readOnly ? (
                            <Button variant={isEditing ? "ghost" : "secondary"} onClick={() => selectRewardForEdit(reward)}>
                              {isEditing ? "Seguir editando" : "Editar"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/40 p-6 text-sm leading-7 text-muted">
                Todavia no hay recompensas cargadas. Crea la primera para empezar a canjear desde este mismo panel.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle className="text-xl">Alta rapida</CardTitle>
              <CardDescription>Inicia una nueva recompensa y editala en una vista enfocada, sin perder el listado.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
              <p>Para crear o editar una recompensa, abrimos una vista dedicada dentro del modulo Loyalty.</p>
              <p className="mt-3">Asi evitamos scroll innecesario y mantenemos el foco en imagen, stock, puntos y estado.</p>
            </div>
            {!readOnly ? (
              <Button className="w-full" onClick={startNewReward}>
                Nueva recompensa
              </Button>
            ) : (
              <Badge variant="muted">Modo solo lectura</Badge>
            )}
          </CardContent>
        </Card>
          </section>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Movimientos recientes</CardTitle>
                <CardDescription>Ledger central para ver acreditaciones, canjes, ajustes y reversas con trazabilidad clara.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {overview.recentMovements.length ? (
                overview.recentMovements.map((movement) => (
                  <div key={movement.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={movement.pointsDelta > 0 ? "success" : "warning"}>
                            {movement.pointsDelta > 0 ? `+${movement.pointsDelta}` : movement.pointsDelta}
                          </Badge>
                          <Badge variant="muted">{titleCaseLabel(movement.direction)}</Badge>
                          <p className="text-sm text-muted">{movement.contact?.name || "Cliente"}</p>
                        </div>
                        <p className="mt-3 font-medium">{movement.reason || "Movimiento de loyalty"}</p>
                        <p className="mt-1 text-sm text-muted">
                          {movement.referenceType ? `${titleCaseLabel(movement.referenceType)} / ` : ""}
                          {movement.referenceId || "Sin referencia"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatDateTimeLabel(movement.createdAt)}</p>
                        <p className="mt-1 text-sm text-muted">{movement.points} pts</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/40 p-6 text-sm leading-7 text-muted">
                  Aun no hay movimientos de puntos. La tabla se va a poblar automaticamente cuando se registren pagos validos o canjes manuales.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function RewardImagePreview({
  image,
  title,
  compact = false,
  large = false
}: {
  image: PortalLoyaltyReward["image"];
  title: string;
  compact?: boolean;
  large?: boolean;
}) {
  if (compact) {
    return image?.url ? (
      <img
        src={image.url}
        alt={image.alt || title}
        className="h-20 w-20 rounded-2xl border border-[color:var(--border)] object-cover"
      />
    ) : (
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-surface/60 text-brandBright">
        <Gift className="h-6 w-6" />
      </div>
    );
  }

  return image?.url ? (
    <img
      src={image.url}
      alt={image.alt || title}
      className={large ? "h-[320px] w-full rounded-[28px] border border-[color:var(--border)] object-cover" : "h-48 w-full rounded-[24px] border border-[color:var(--border)] object-cover"}
    />
  ) : (
    <div className={`flex w-full items-center justify-center border border-dashed border-[color:var(--border)] bg-surface/45 text-muted ${large ? "h-[320px] rounded-[28px]" : "h-48 rounded-[24px]"}`}>
      <div className="text-center">
        <Gift className="mx-auto h-8 w-8 text-brandBright" />
        <p className="mt-3 text-sm">Sin imagen cargada</p>
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function ImpactCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
            <p className="mt-2 text-sm text-muted">{helper}</p>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brandBright">
            {icon}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
