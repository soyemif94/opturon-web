"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  CircleSlash,
  Crown,
  MoreHorizontal,
  RefreshCcw,
  ShieldCheck,
  UserPlus2,
  Users2
} from "lucide-react";
import { SimpleAvatar } from "@/components/app/simple-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SkeletonLine } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/ui/cn";
import {
  type AdminPartner,
  type AdminPartnerAttribution,
  type AdminPartnerDetails,
  type PartnerPreviewBundle,
  type PartnerQueryState,
  PARTNERS_ADMIN_CREATE_ENABLED,
  PARTNERS_ADMIN_CREATE_TOOLTIP,
  buildAuditHeadline,
  buildPartnerKpis,
  filterAndSortPartners,
  formatPartnerDate,
  formatPartnerDateTime,
  getPartnerActionAvailability,
  getPartnerCode,
  getPartnerDisplayName,
  getPartnerErrorMessage,
  getPartnerPhone,
  getPartnerPreviewBundle,
  getPartnerRankLabel,
  getPartnerRankTone,
  getPartnerSponsorLabel,
  getPartnerStatusLabel,
  getPartnerStatusTone
} from "@/lib/partners-admin-ui";

type PartnersAdminWorkspaceProps = {
  previewMode?: boolean;
  previewBundle?: PartnerPreviewBundle;
};

type PartnersListResponse = {
  success?: boolean;
  data?: {
    ok?: boolean;
    partners?: AdminPartner[];
  };
  error?: string;
};

type PartnerDetailsResponse = {
  success?: boolean;
  data?: AdminPartnerDetails;
  error?: string;
};

type PartnerMutationResponse = {
  success?: boolean;
  data?: {
    partner?: AdminPartner;
    lifecycle?: AdminPartnerDetails["lifecycle"];
    invitation?: {
      status?: string | null;
      expiresAt?: string | null;
      sentAt?: string | null;
    } | null;
  };
  error?: string;
  detail?: string;
};

type PartnerInviteFormState = {
  displayName: string;
  email: string;
  phone: string;
  code: string;
  sponsorPartnerId: string;
};

type StatusDialogState = {
  partnerId: string;
  nextStatus: "active" | "suspended";
} | null;

type CancelInvitationDialogState = {
  partnerId: string;
} | null;

type DeactivateDialogState = {
  partnerId: string;
} | null;

const INITIAL_QUERY: PartnerQueryState = {
  search: "",
  status: "all",
  rank: "all",
  sort: "recent"
};

const INITIAL_INVITE_FORM: PartnerInviteFormState = {
  displayName: "",
  email: "",
  phone: "",
  code: "",
  sponsorPartnerId: ""
};

const OPEN_PARTNER_INVITE_EVENT = "opturon:open-partner-invite";

const DEFAULT_PREVIEW_BUNDLE = getPartnerPreviewBundle();
const PANEL_CLASS =
  "border-white/8 bg-[linear-gradient(180deg,rgba(19,30,45,0.96),rgba(11,18,30,0.96))] shadow-[0_24px_60px_rgba(2,8,18,0.34)]";
const PANEL_MUTED_CLASS =
  "border-white/8 bg-[linear-gradient(180deg,rgba(20,31,47,0.94),rgba(13,21,34,0.94))] shadow-[0_18px_46px_rgba(2,8,18,0.28)]";
const TABLE_ROW_CLASS =
  "border-t border-white/8 bg-[rgba(10,17,29,0.58)] transition-colors hover:bg-[rgba(176,80,0,0.08)]";
const TOOLBAR_FIELD_CLASS =
  "h-11 rounded-2xl border border-white/12 bg-[rgba(10,17,29,0.72)] px-3 text-sm text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";
const DETAIL_PANEL_CLASS =
  "border-white/8 bg-[linear-gradient(180deg,rgba(18,29,44,0.98),rgba(8,15,25,0.98))] shadow-[0_30px_80px_rgba(2,8,18,0.42)]";

function KpiCard({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users2;
}) {
  return (
    <Card className={cn("overflow-hidden", PANEL_MUTED_CLASS)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardDescription className="text-[11px] uppercase tracking-[0.18em] text-muted/90">{label}</CardDescription>
            <CardTitle className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</CardTitle>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/30 bg-brand/12 text-brandBright shadow-[0_10px_24px_rgba(176,80,0,0.12)]">
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm leading-6 text-muted/90">{hint}</p>
      </CardContent>
    </Card>
  );
}

function ToolbarSelect({
  value,
  onChange,
  options,
  ariaLabel
}: {
  value: string;
  onChange: (nextValue: string) => void;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={TOOLBAR_FIELD_CLASS}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = String((payload as Record<string, unknown>).detail || "").trim();
    const error = String((payload as Record<string, unknown>).error || "").trim();
    if (detail) return detail;
    if (error) return error;
  }
  return fallback;
}

async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function PartnersAdminWorkspace({
  previewMode = false,
  previewBundle = DEFAULT_PREVIEW_BUNDLE
}: PartnersAdminWorkspaceProps) {
  const [partners, setPartners] = useState<AdminPartner[]>(previewMode ? previewBundle.partners : []);
  const [query, setQuery] = useState(INITIAL_QUERY);
  const deferredSearch = useDeferredValue(query.search);
  const [loading, setLoading] = useState(!previewMode);
  const [refreshing, setRefreshing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartnerDetails, setSelectedPartnerDetails] = useState<AdminPartnerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusDialog, setStatusDialog] = useState<StatusDialogState>(null);
  const [cancelInvitationDialog, setCancelInvitationDialog] = useState<CancelInvitationDialogState>(null);
  const [deactivateDialog, setDeactivateDialog] = useState<DeactivateDialogState>(null);
  const [busyPartnerId, setBusyPartnerId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<PartnerInviteFormState>(INITIAL_INVITE_FORM);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [deactivateDetails, setDeactivateDetails] = useState<AdminPartnerDetails | null>(null);

  const partnerMap = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);
  const filteredPartners = useMemo(
    () =>
      filterAndSortPartners(
        partners,
        {
          ...query,
          search: deferredSearch
        },
        partnerMap
      ),
    [deferredSearch, partnerMap, partners, query]
  );
  const kpis = useMemo(() => buildPartnerKpis(partners), [partners]);
  const selectedPartner = selectedPartnerId ? partnerMap.get(selectedPartnerId) || null : null;

  async function loadPartners(mode: "initial" | "refresh" = "initial") {
    if (previewMode) {
      setPartners(previewBundle.partners);
      setErrorStatus(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    try {
      const response = await fetch("/api/app/admin/partners", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = (await readJsonSafe(response)) as PartnersListResponse | null;

      if (!response.ok) {
        setErrorStatus(response.status);
        throw new Error(readErrorMessage(payload, getPartnerErrorMessage(response.status)));
      }

      setPartners(Array.isArray(payload?.data?.partners) ? payload.data?.partners || [] : []);
      setErrorStatus(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : getPartnerErrorMessage();
      if (mode === "refresh") {
        toast.error(message);
      }
      if (mode === "initial") {
        setPartners([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function openPartnerDetails(partnerId: string) {
    setSelectedPartnerId(partnerId);
    setSelectedPartnerDetails(null);
    setDetailsLoading(true);

    if (previewMode) {
      setSelectedPartnerDetails(previewBundle.detailsById[partnerId] || null);
      setDetailsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/app/admin/partners/${encodeURIComponent(partnerId)}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = (await readJsonSafe(response)) as PartnerDetailsResponse | null;
      if (!response.ok || !payload?.data) {
        throw new Error(readErrorMessage(payload, "No pudimos cargar el detalle del asesor."));
      }
      setSelectedPartnerDetails(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos cargar el detalle del asesor.");
      setSelectedPartnerDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openDeactivateDialog(partnerId: string) {
    setDeactivateDialog({ partnerId });
    setDeactivateDetails(null);

    if (previewMode) {
      setDeactivateDetails(previewBundle.detailsById[partnerId] || null);
      return;
    }

    try {
      const response = await fetch(`/api/app/admin/partners/${encodeURIComponent(partnerId)}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = (await readJsonSafe(response)) as PartnerDetailsResponse | null;
      if (!response.ok || !payload?.data) {
        throw new Error(readErrorMessage(payload, "No pudimos cargar el resumen para la baja."));
      }
      setDeactivateDetails(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos cargar el resumen para la baja.");
    }
  }

  function resetInviteForm() {
    setInviteForm(INITIAL_INVITE_FORM);
  }

  function applyPartnerMutationResult(body: PartnerMutationResponse | null) {
    const nextPartner = body?.data?.partner;
    if (!nextPartner) return false;

    setPartners((current) => current.map((partner) => (partner.id === nextPartner.id ? nextPartner : partner)));
    setSelectedPartnerDetails((current) =>
      current && current.partner.id === nextPartner.id
        ? {
            ...current,
            partner: nextPartner,
            lifecycle: body?.data?.lifecycle || current.lifecycle
          }
        : current
    );
    return true;
  }

  async function submitPartnerInvite(event: React.FormEvent) {
    event.preventDefault();
    if (inviteBusy) return;

    const payload = {
      displayName: inviteForm.displayName.trim(),
      email: inviteForm.email.trim().toLowerCase(),
      phone: inviteForm.phone.trim() || undefined,
      code: inviteForm.code.trim(),
      sponsorPartnerId: inviteForm.sponsorPartnerId || undefined
    };

    if (!payload.displayName || !payload.email || !payload.code) {
      toast.error("Nombre, email y codigo son obligatorios.");
      return;
    }

    if (!payload.email.includes("@")) {
      toast.error("Ingresa un email valido.");
      return;
    }

    setInviteBusy(true);
    try {
      const response = await fetch("/api/app/admin/partners/invite", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const body = (await readJsonSafe(response)) as PartnerMutationResponse | null;
      if (!response.ok || !body?.data?.partner) {
        throw new Error(readErrorMessage(body, "No se pudo enviar la invitacion del asesor."));
      }

      setPartners((current) => [body.data!.partner!, ...current.filter((partner) => partner.id !== body.data!.partner!.id)]);
      setInviteDialogOpen(false);
      resetInviteForm();
      toast.success("Invitacion enviada");
      await loadPartners("refresh");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar la invitacion del asesor.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function resendInvite(partnerId: string) {
    if (previewMode) {
      toast.error("La vista local no ejecuta cambios reales.");
      return;
    }

    setBusyPartnerId(partnerId);
    try {
      const response = await fetch(`/api/app/admin/partners/${encodeURIComponent(partnerId)}/resend-invite`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin"
      });
      const body = (await readJsonSafe(response)) as PartnerMutationResponse | null;
      if (!response.ok || !body?.data?.partner) {
        throw new Error(readErrorMessage(body, "No se pudo reenviar la invitacion."));
      }

      setPartners((current) => current.map((partner) => (partner.id === body.data!.partner!.id ? body.data!.partner! : partner)));
      setSelectedPartnerDetails((current) =>
        current && current.partner.id === body.data!.partner!.id
          ? {
              ...current,
              partner: body.data!.partner!
            }
          : current
      );
      toast.success("Invitacion reenviada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reenviar la invitacion.");
    } finally {
      setBusyPartnerId(null);
    }
  }

  async function cancelInvitation(partnerId: string) {
    if (previewMode) {
      toast.error("La vista local no ejecuta cambios reales.");
      return;
    }

    setBusyPartnerId(partnerId);
    try {
      const response = await fetch(`/api/app/admin/partners/${encodeURIComponent(partnerId)}/cancel-invitation`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: "admin_invitation_cancellation" })
      });
      const body = (await readJsonSafe(response)) as PartnerMutationResponse | null;
      if (!response.ok) {
        throw new Error(readErrorMessage(body, "No se pudo cancelar la invitacion."));
      }

      applyPartnerMutationResult(body);
      toast.success("Invitacion cancelada");
      setCancelInvitationDialog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la invitacion.");
    } finally {
      setBusyPartnerId(null);
    }
  }

  async function changePartnerStatus(partnerId: string, nextStatus: "active" | "suspended") {
    if (previewMode) {
      toast.error("La vista local no ejecuta cambios reales.");
      return;
    }

    setBusyPartnerId(partnerId);
    try {
      const response = await fetch(`/api/app/admin/partners/${encodeURIComponent(partnerId)}/status`, {
        method: "PATCH",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const payload = (await readJsonSafe(response)) as { success?: boolean; data?: { partner?: AdminPartner }; error?: string } | null;
      if (!response.ok) {
        throw new Error(readErrorMessage(payload, "No se pudo actualizar el estado del asesor."));
      }

      if (!applyPartnerMutationResult(payload as PartnerMutationResponse | null)) {
        await loadPartners("refresh");
      }

      toast.success(nextStatus === "active" ? "Asesor activado" : "Asesor suspendido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado del asesor.");
    } finally {
      setBusyPartnerId(null);
      setStatusDialog(null);
    }
  }

  async function deactivatePartnerAccount(partnerId: string) {
    if (previewMode) {
      toast.error("La vista local no ejecuta cambios reales.");
      return;
    }

    const reason = deactivationReason.trim();
    if (!reason) {
      toast.error("El motivo de la baja es obligatorio.");
      return;
    }

    setBusyPartnerId(partnerId);
    try {
      const response = await fetch(`/api/app/admin/partners/${encodeURIComponent(partnerId)}/deactivate`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      });
      const body = (await readJsonSafe(response)) as PartnerMutationResponse | null;
      if (!response.ok) {
        throw new Error(readErrorMessage(body, "No se pudo dar de baja al asesor."));
      }

      applyPartnerMutationResult(body);
      setDeactivationReason("");
      setDeactivateDialog(null);
      setDeactivateDetails(null);
      toast.success("Asesor dado de baja");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo dar de baja al asesor.");
    } finally {
      setBusyPartnerId(null);
    }
  }

  useEffect(() => {
    void loadPartners("initial");
  }, []);

  useEffect(() => {
    function onOpenInvite() {
      setInviteDialogOpen(true);
    }

    window.addEventListener(OPEN_PARTNER_INVITE_EVENT, onOpenInvite);
    return () => window.removeEventListener(OPEN_PARTNER_INVITE_EVENT, onOpenInvite);
  }, []);

  function renderMainState() {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`partners-kpi-skeleton-${index}`} className={PANEL_MUTED_CLASS}>
                <CardHeader>
                  <SkeletonLine className="h-3 w-24" />
                  <SkeletonLine className="h-8 w-20" />
                </CardHeader>
                <CardContent className="pt-0">
                  <SkeletonLine className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className={PANEL_CLASS}>
            <CardHeader className="pb-3">
              <SkeletonLine className="h-10 w-full max-w-[560px]" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonLine key={`partners-row-skeleton-${index}`} className="h-14 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (errorStatus) {
      return (
        <Card className={PANEL_CLASS}>
          <CardContent className="p-6">
            <EmptyState
              icon={<CircleSlash />}
              title="No pudimos cargar la red de asesores."
              description={getPartnerErrorMessage(errorStatus)}
              action={{ label: "Reintentar", onClick: () => void loadPartners("refresh") }}
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Asesores totales" value={kpis.total} hint="Base visible del programa partners administrada desde Opturon." icon={Users2} />
          <KpiCard label="Activos" value={kpis.active} hint="Asesores actualmente operativos y con acceso habilitado." icon={ShieldCheck} />
          <KpiCard label="Clientes atribuidos" value={kpis.attributedClients} hint="Suma real de atribuciones activas informadas por el backend." icon={ArrowUpRight} />
          <KpiCard label="Con rango asignado" value={kpis.withAssignedRank} hint="Partners que ya tienen historial o rango comercial visible." icon={Crown} />
        </div>

        <Card className={cn("overflow-hidden", PANEL_CLASS)}>
          <CardHeader className="gap-4 border-b border-white/8 pb-4">
            <div>
              <CardTitle className="text-xl text-white">Vista operativa</CardTitle>
              <CardDescription className="text-sm text-muted/90">
                Busca por nombre, email o codigo. Filtra por estado y rango sin salir del Admin.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1 xl:flex-wrap">
                <Input
                  value={query.search}
                  onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Buscar por nombre, email o codigo"
                  className={cn("min-w-[260px]", TOOLBAR_FIELD_CLASS)}
                />
                <ToolbarSelect
                  ariaLabel="Filtrar partners por estado"
                  value={query.status}
                  onChange={(nextValue) => setQuery((current) => ({ ...current, status: nextValue as PartnerQueryState["status"] }))}
                  options={[
                    { value: "all", label: "Todos" },
                    { value: "active", label: "Activos" },
                    { value: "invited", label: "Invitaciones pendientes" },
                    { value: "suspended", label: "Suspendidos" },
                    { value: "disabled", label: "Dados de baja" },
                    { value: "invitation_canceled", label: "Invitaciones canceladas" }
                  ]}
                />
                <ToolbarSelect
                  ariaLabel="Filtrar partners por rango"
                  value={query.rank}
                  onChange={(nextValue) => setQuery((current) => ({ ...current, rank: nextValue as PartnerQueryState["rank"] }))}
                  options={[
                    { value: "all", label: "Todos los rangos" },
                    { value: "sin_rango", label: "Sin rango" },
                    { value: "asesor", label: "Asesor" },
                    { value: "lider", label: "Lider" },
                    { value: "coordinador", label: "Coordinador" },
                    { value: "emperador", label: "Emperador" }
                  ]}
                />
                <ToolbarSelect
                  ariaLabel="Ordenar partners"
                  value={query.sort}
                  onChange={(nextValue) => setQuery((current) => ({ ...current, sort: nextValue as PartnerQueryState["sort"] }))}
                  options={[
                    { value: "recent", label: "Mas recientes" },
                    { value: "oldest", label: "Mas antiguos" },
                    { value: "name", label: "Nombre" },
                    { value: "last_login", label: "Ultimo acceso" }
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {previewMode ? <Badge variant="outline" className="border-white/14 bg-white/5 text-muted/90">Vista local</Badge> : null}
                <Button
                  type="button"
                  className="rounded-2xl"
                  onClick={() => setInviteDialogOpen(true)}
                  disabled={!PARTNERS_ADMIN_CREATE_ENABLED}
                  title={PARTNERS_ADMIN_CREATE_TOOLTIP}
                >
                  <UserPlus2 className="mr-2 h-4 w-4" />
                  Nuevo asesor
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10"
                  onClick={() => void loadPartners("refresh")}
                  disabled={refreshing}
                >
                  <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing ? "animate-spin" : "")} />
                  Actualizar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {filteredPartners.length === 0 ? (
              <div className="space-y-4">
                <EmptyState
                  icon={<Users2 />}
                  title={partners.length === 0 ? "Todavia no hay asesores" : "No encontramos asesores para este filtro"}
                  description={
                    partners.length === 0
                      ? "Cuando agregues asesores, vas a poder seguir su actividad, clientes y evolucion desde aca."
                      : "Prueba con otro estado, rango o termino de busqueda para volver a ver la red."
                  }
                />
                {partners.length === 0 ? (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-2xl"
                      onClick={() => setInviteDialogOpen(true)}
                      disabled={!PARTNERS_ADMIN_CREATE_ENABLED}
                      title={PARTNERS_ADMIN_CREATE_TOOLTIP}
                    >
                      <UserPlus2 className="mr-2 h-4 w-4" />
                      Crear primer asesor
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {filteredPartners.length > 0 ? (
              <>
                <div className="hidden overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(8,15,25,0.56)] lg:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[rgba(255,255,255,0.04)] text-[11px] uppercase tracking-[0.16em] text-muted/90">
                        <tr>
                          <th className="px-5 py-4">Asesor</th>
                          <th className="px-5 py-4">Codigo</th>
                          <th className="px-5 py-4">Estado</th>
                          <th className="px-5 py-4">Rango</th>
                          <th className="px-5 py-4">Sponsor</th>
                          <th className="px-5 py-4">Clientes activos</th>
                          <th className="px-5 py-4">Ultimo acceso</th>
                          <th className="px-5 py-4">Alta</th>
                          <th className="px-5 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPartners.map((partner) => {
                          const availability = getPartnerActionAvailability(partner);
                          const nextStatus = availability.nextStatus;
                          return (
                            <tr
                              key={partner.id}
                              className={TABLE_ROW_CLASS}
                            >
                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() => void openPartnerDetails(partner.id)}
                                  className="flex items-center gap-3 text-left"
                                >
                                  <SimpleAvatar
                                    name={getPartnerDisplayName(partner)}
                                    className="h-11 w-11 rounded-2xl border border-brand/15 bg-brand/10"
                                    fallbackClassName="bg-brand/10 text-sm text-brandBright"
                                  />
                                  <span className="min-w-0">
                                    <span className="block truncate font-medium text-text">{getPartnerDisplayName(partner)}</span>
                                    <span className="block truncate text-xs text-muted">{partner.email}</span>
                                  </span>
                                </button>
                              </td>
                              <td className="px-5 py-4">
                                <Badge variant="outline" className="border-white/12 bg-white/5 text-white/82">
                                  {getPartnerCode(partner)}
                                </Badge>
                              </td>
                              <td className="px-5 py-4">
                                <Badge variant={getPartnerStatusTone(partner.status)}>{getPartnerStatusLabel(partner.status)}</Badge>
                              </td>
                              <td className="px-5 py-4">
                                <Badge variant={getPartnerRankTone(partner.currentRankCode)}>{getPartnerRankLabel(partner.currentRankCode)}</Badge>
                              </td>
                              <td className="px-5 py-4 text-muted/90">{getPartnerSponsorLabel(partner, partnerMap)}</td>
                              <td className="px-5 py-4 font-medium text-white">{Number(partner.activeAttributionCount || 0)}</td>
                              <td className="px-5 py-4 text-muted/90">{formatPartnerDateTime(partner.lastLoginAt)}</td>
                              <td className="px-5 py-4 text-muted/90">{formatPartnerDate(partner.createdAt)}</td>
                              <td className="px-5 py-4 text-right">
                                <PartnerRowActions
                                  partner={partner}
                                  busy={busyPartnerId === partner.id}
                                  onViewDetail={() => void openPartnerDetails(partner.id)}
                                  onResendInvite={
                                    availability.canResendInvite ? () => void resendInvite(partner.id) : undefined
                                  }
                                  onCancelInvite={
                                    availability.canCancelInvitation ? () => setCancelInvitationDialog({ partnerId: partner.id }) : undefined
                                  }
                                  onToggleStatus={
                                    availability.canChangeStatus && nextStatus
                                      ? () => setStatusDialog({ partnerId: partner.id, nextStatus })
                                      : undefined
                                  }
                                  onDeactivate={
                                    availability.canDeactivate ? () => void openDeactivateDialog(partner.id) : undefined
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-3 lg:hidden">
                  {filteredPartners.map((partner) => {
                    const availability = getPartnerActionAvailability(partner);
                    const nextStatus = availability.nextStatus;
                    return (
                      <Card key={partner.id} className={PANEL_MUTED_CLASS}>
                        <CardContent className="space-y-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <button type="button" onClick={() => void openPartnerDetails(partner.id)} className="flex min-w-0 items-center gap-3 text-left">
                              <SimpleAvatar
                                name={getPartnerDisplayName(partner)}
                                className="h-11 w-11 rounded-2xl border border-brand/15 bg-brand/10"
                                fallbackClassName="bg-brand/10 text-sm text-brandBright"
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{getPartnerDisplayName(partner)}</span>
                                <span className="block truncate text-xs text-muted">{partner.email}</span>
                              </span>
                            </button>
                            <PartnerRowActions
                              partner={partner}
                              busy={busyPartnerId === partner.id}
                              onViewDetail={() => void openPartnerDetails(partner.id)}
                              onResendInvite={
                                availability.canResendInvite ? () => void resendInvite(partner.id) : undefined
                              }
                              onCancelInvite={
                                availability.canCancelInvitation ? () => setCancelInvitationDialog({ partnerId: partner.id }) : undefined
                              }
                              onToggleStatus={
                                availability.canChangeStatus && nextStatus
                                  ? () => setStatusDialog({ partnerId: partner.id, nextStatus })
                                  : undefined
                              }
                              onDeactivate={
                                availability.canDeactivate ? () => void openDeactivateDialog(partner.id) : undefined
                              }
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getPartnerStatusTone(partner.status)}>{getPartnerStatusLabel(partner.status)}</Badge>
                            <Badge variant={getPartnerRankTone(partner.currentRankCode)}>{getPartnerRankLabel(partner.currentRankCode)}</Badge>
                            <Badge variant="outline" className="border-white/12 bg-white/5 text-white/82">
                              {getPartnerCode(partner)}
                            </Badge>
                          </div>

                          <div className="grid gap-3 text-sm text-muted sm:grid-cols-2">
                            <InfoRow label="Sponsor" value={getPartnerSponsorLabel(partner, partnerMap)} />
                            <InfoRow label="Clientes activos" value={String(Number(partner.activeAttributionCount || 0))} />
                            <InfoRow label="Ultimo acceso" value={formatPartnerDateTime(partner.lastLoginAt)} />
                            <InfoRow label="Alta" value={formatPartnerDate(partner.createdAt)} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {renderMainState()}

      <Dialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) resetInviteForm();
        }}
      >
        <DialogContent className={cn("max-w-2xl rounded-[28px]", DETAIL_PANEL_CLASS)}>
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo asesor</DialogTitle>
            <DialogDescription className="text-muted/90">
              Crea el asesor en estado seguro de invitacion y envia un acceso de un solo uso por email.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitPartnerInvite} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-muted/90">
                Nombre
                <Input
                  value={inviteForm.displayName}
                  onChange={(event) => setInviteForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="Nombre del asesor"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-muted/90">
                Email
                <Input
                  value={inviteForm.email}
                  onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="asesor@opturon.com"
                  type="email"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-muted/90">
                Telefono opcional
                <Input
                  value={inviteForm.phone}
                  onChange={(event) => setInviteForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+54 9 ..."
                />
              </label>
              <label className="grid gap-2 text-sm text-muted/90">
                Codigo
                <Input
                  value={inviteForm.code}
                  onChange={(event) => setInviteForm((current) => ({ ...current, code: event.target.value }))}
                  placeholder="ASESOR-CENTRO"
                  required
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-muted/90">
              Sponsor opcional
              <select
                value={inviteForm.sponsorPartnerId}
                onChange={(event) => setInviteForm((current) => ({ ...current, sponsorPartnerId: event.target.value }))}
                className={TOOLBAR_FIELD_CLASS}
              >
                <option value="">Sin sponsor</option>
                {partners
                  .filter((partner) => String(partner.status || "").toLowerCase() === "active")
                  .map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {getPartnerDisplayName(partner)} · {getPartnerCode(partner)}
                    </option>
                  ))}
              </select>
            </label>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-6 text-muted/90">
              El asesor se crea sin contrasena operativa. Solo podra ingresar despues de aceptar la invitacion enviada por email.
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10"
                onClick={() => setInviteDialogOpen(false)}
                disabled={inviteBusy}
              >
                Cancelar
              </Button>
              <Button type="submit" className="rounded-2xl" disabled={inviteBusy}>
                {inviteBusy ? "Enviando..." : "Crear y enviar invitacion"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedPartnerId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPartnerId(null);
            setSelectedPartnerDetails(null);
          }
        }}
      >
        <DialogContent
          className={cn(
            "left-auto right-0 top-0 h-screen max-w-[520px] translate-x-0 translate-y-0 overflow-y-auto rounded-none border-r-0 p-0",
            DETAIL_PANEL_CLASS
          )}
        >
          <div className="border-b border-white/8 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-white">Detalle del asesor</DialogTitle>
              <DialogDescription className="text-muted/90">
                Identidad, carrera comercial y trazabilidad reciente del partner seleccionado.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 px-6 py-6">
            {detailsLoading ? (
              <div className="space-y-4">
                <SkeletonLine className="h-24 w-full" />
                <SkeletonLine className="h-32 w-full" />
                <SkeletonLine className="h-32 w-full" />
              </div>
            ) : selectedPartner ? (
              <>
                <Card className={PANEL_MUTED_CLASS}>
                  <CardContent className="space-y-5 p-5">
                    <div className="flex items-start gap-4">
                      <SimpleAvatar
                        name={getPartnerDisplayName(selectedPartner)}
                        className="h-16 w-16 rounded-[24px] border border-brand/20 bg-brand/10"
                        fallbackClassName="bg-brand/10 text-lg text-brandBright"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getPartnerStatusTone(selectedPartner.status)}>{getPartnerStatusLabel(selectedPartner.status)}</Badge>
                          <Badge variant={getPartnerRankTone(selectedPartner.currentRankCode)}>{getPartnerRankLabel(selectedPartner.currentRankCode)}</Badge>
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{getPartnerDisplayName(selectedPartner)}</h2>
                        <p className="mt-1 text-sm text-muted/90">{selectedPartner.email}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoRow label="Codigo" value={getPartnerCode(selectedPartner)} />
                      <InfoRow label="Telefono" value={getPartnerPhone(selectedPartner)} />
                      <InfoRow label="Fecha de alta" value={formatPartnerDate(selectedPartner.createdAt)} />
                      <InfoRow label="Ultimo acceso" value={formatPartnerDateTime(selectedPartner.lastLoginAt)} />
                    </div>
                  </CardContent>
                </Card>

                <Card className={PANEL_MUTED_CLASS}>
                  <CardHeader>
                    <div>
                      <CardTitle className="text-white">Carrera</CardTitle>
                      <CardDescription className="text-muted/90">
                        Vista actual del sponsor, el rango visible y la cartera activa del partner.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
                    <InfoRow label="Rango actual" value={getPartnerRankLabel(selectedPartner.currentRankCode)} />
                    <InfoRow label="Sponsor" value={getPartnerSponsorLabel(selectedPartner, partnerMap)} />
                    <InfoRow label="Clientes activos" value={String(Number(selectedPartner.activeAttributionCount || 0))} />
                    <InfoRow label="Notas" value={selectedPartner.profile?.notes || "Sin notas visibles"} />
                    <InfoRow label="Comisiones registradas" value={String(Number(selectedPartnerDetails?.lifecycle?.commissionEntries || 0))} />
                    <InfoRow label="Descendientes directos" value={String(Number(selectedPartnerDetails?.lifecycle?.directDescendants || 0))} />
                  </CardContent>
                </Card>

                <Card className={PANEL_MUTED_CLASS}>
                  <CardHeader
                    action={
                      <div className="flex flex-wrap gap-2">
                        {getPartnerActionAvailability(selectedPartner).canResendInvite ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10"
                            onClick={() => void resendInvite(selectedPartner.id)}
                            disabled={busyPartnerId === selectedPartner.id}
                          >
                            {busyPartnerId === selectedPartner.id ? "Enviando..." : "Reenviar invitacion"}
                          </Button>
                        ) : null}
                        {getPartnerActionAvailability(selectedPartner).canCancelInvitation ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10"
                            onClick={() => setCancelInvitationDialog({ partnerId: selectedPartner.id })}
                            disabled={busyPartnerId === selectedPartner.id}
                          >
                            Cancelar invitacion
                          </Button>
                        ) : null}
                        {getPartnerActionAvailability(selectedPartner).canChangeStatus && getPartnerActionAvailability(selectedPartner).nextStatus ? (
                          <Button
                            type="button"
                            variant={getPartnerActionAvailability(selectedPartner).nextStatus === "active" ? "primary" : "secondary"}
                            className="rounded-2xl"
                            onClick={() =>
                              setStatusDialog({
                                partnerId: selectedPartner.id,
                                nextStatus: getPartnerActionAvailability(selectedPartner).nextStatus as "active" | "suspended"
                              })
                            }
                            disabled={busyPartnerId === selectedPartner.id}
                          >
                            {busyPartnerId === selectedPartner.id
                              ? "Guardando..."
                              : getPartnerActionAvailability(selectedPartner).nextStatus === "active"
                                ? "Activar"
                                : "Suspender"}
                          </Button>
                        ) : null}
                        {getPartnerActionAvailability(selectedPartner).canDeactivate ? (
                          <Button
                            type="button"
                            variant="destructive"
                            className="rounded-2xl"
                            onClick={() => void openDeactivateDialog(selectedPartner.id)}
                            disabled={busyPartnerId === selectedPartner.id}
                          >
                            Dar de baja asesor
                          </Button>
                        ) : null}
                      </div>
                    }
                  >
                    <div>
                      <CardTitle className="text-white">Acciones</CardTitle>
                      <CardDescription className="text-muted/90">
                        Solo se conectan operaciones reales ya disponibles en el backend seguro.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 pt-0">
                    <ActionHint title="Editar perfil" description="Proximamente" disabled />
                    {getPartnerActionAvailability(selectedPartner).canResendInvite ? (
                      <ActionHint title="Invitacion pendiente" description="Puedes reenviar el acceso seguro sin exponer token ni contrasena." />
                    ) : null}
                    {getPartnerActionAvailability(selectedPartner).canCancelInvitation ? (
                      <ActionHint title="Cancelar invitacion" description="El enlace deja de funcionar y la cuenta pendiente sale de la vista operativa." />
                    ) : null}
                    {getPartnerActionAvailability(selectedPartner).canDeactivate ? (
                      <ActionHint title="Dar de baja asesor" description="Bloquea acceso futuro, conserva historial y exige revisar dependencias activas antes de confirmar." />
                    ) : null}
                    <ActionHint title="Ver clientes atribuidos" description="Visible en la seccion de atribuciones de este panel." />
                    <ActionHint title="Ver jerarquia" description="Proximamente" disabled />
                    <ActionHint title="Ver auditoria" description="Visible en la trazabilidad reciente del asesor." />
                  </CardContent>
                </Card>

                <Card className={PANEL_MUTED_CLASS}>
                  <CardHeader>
                    <div>
                      <CardTitle className="text-white">Clientes atribuidos</CardTitle>
                      <CardDescription className="text-muted/90">
                        Solo mostramos atribuciones reales entregadas por el endpoint admin.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {selectedPartnerDetails?.attributions && selectedPartnerDetails.attributions.length > 0 ? (
                      selectedPartnerDetails.attributions.slice(0, 6).map((attribution) => (
                        <AttributionCard key={attribution.id} attribution={attribution} />
                      ))
                    ) : (
                      <EmptyState
                        className="min-h-[180px]"
                        icon={<BadgeCheck />}
                        title="Sin clientes atribuidos"
                        description="Cuando este asesor tenga attributions activas en backend, se van a listar aca automaticamente."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className={PANEL_MUTED_CLASS}>
                  <CardHeader>
                    <div>
                      <CardTitle className="text-white">Auditoria reciente</CardTitle>
                      <CardDescription className="text-muted/90">
                        Historial breve sin exponer tokens, UUIDs completos ni datos internos sensibles.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {selectedPartnerDetails?.audit && selectedPartnerDetails.audit.length > 0 ? (
                      selectedPartnerDetails.audit.slice(0, 6).map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.03)] px-4 py-3">
                          <p className="text-sm font-medium text-white">{buildAuditHeadline(entry)}</p>
                          <p className="mt-1 text-xs text-muted/90">
                            {entry.actorType ? `Actor: ${entry.actorType}` : "Actor no informado"} · {formatPartnerDateTime(entry.createdAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        className="min-h-[180px]"
                        icon={<ShieldCheck />}
                        title="Sin eventos recientes"
                        description="El historial de auditoria aparecera aca cuando el backend devuelva movimientos para este asesor."
                      />
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <EmptyState
                icon={<Users2 />}
                title="Selecciona un asesor"
                description="Abre un detalle desde la tabla para revisar identidad, sponsor, clientes y auditoria."
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelInvitationDialog)}
        onOpenChange={(open) => (!open ? setCancelInvitationDialog(null) : null)}
        title="Cancelar invitacion"
        description="El enlace enviado dejara de funcionar y esta cuenta pendiente sera retirada del listado operativo."
        confirmText="Cancelar invitacion"
        onConfirm={() =>
          cancelInvitationDialog ? cancelInvitation(cancelInvitationDialog.partnerId) : Promise.resolve()
        }
      />

      <ConfirmDialog
        open={Boolean(statusDialog)}
        onOpenChange={(open) => (!open ? setStatusDialog(null) : null)}
        title={statusDialog?.nextStatus === "active" ? "Activar asesor" : "Suspender asesor"}
        description={
          statusDialog?.nextStatus === "active"
            ? "El partner volvera a quedar habilitado para operar y autenticar en el portal partners."
            : "El partner dejara de operar hasta nueva activacion. No se borra historial ni atribuciones."
        }
        confirmText={statusDialog?.nextStatus === "active" ? "Activar" : "Suspender"}
        onConfirm={() =>
          statusDialog ? changePartnerStatus(statusDialog.partnerId, statusDialog.nextStatus) : Promise.resolve()
        }
      />

      <Dialog
        open={Boolean(deactivateDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateDialog(null);
            setDeactivationReason("");
            setDeactivateDetails(null);
          }
        }}
      >
        <DialogContent className={cn("max-w-2xl rounded-[28px]", DETAIL_PANEL_CLASS)}>
          <DialogHeader>
            <DialogTitle className="text-white">Dar de baja asesor</DialogTitle>
            <DialogDescription className="text-muted/90">
              Conserva auditoria, comisiones y relaciones historicas. El acceso quedara bloqueado de forma definitiva.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow
                label="Nombre"
                value={deactivateDialog ? getPartnerDisplayName(partnerMap.get(deactivateDialog.partnerId) || { id: "", email: "", profile: null }) : "Sin registro"}
              />
              <InfoRow label="Email" value={deactivateDialog ? partnerMap.get(deactivateDialog.partnerId)?.email || "Sin registro" : "Sin registro"} />
              <InfoRow label="Clientes activos" value={String(Number(deactivateDetails?.lifecycle?.activeClients || 0))} />
              <InfoRow label="Descendientes directos" value={String(Number(deactivateDetails?.lifecycle?.directDescendants || 0))} />
              <InfoRow label="Comisiones registradas" value={String(Number(deactivateDetails?.lifecycle?.commissionEntries || 0))} />
              <InfoRow label="Atribuciones vigentes" value={String(Number(deactivateDetails?.lifecycle?.activeAttributions || 0))} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-muted/90">
              Si existen clientes activos o asesores asociados, la baja se bloquea hasta resolver esas dependencias de forma explicita.
            </div>
            <label className="grid gap-2 text-sm text-muted/90">
              Motivo de la baja
              <Input
                value={deactivationReason}
                onChange={(event) => setDeactivationReason(event.target.value)}
                placeholder="Ej. Cierre comercial definitivo"
                required
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10"
                onClick={() => {
                  setDeactivateDialog(null);
                  setDeactivationReason("");
                  setDeactivateDetails(null);
                }}
                disabled={busyPartnerId === deactivateDialog?.partnerId}
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-2xl"
                onClick={() => (deactivateDialog ? deactivatePartnerAccount(deactivateDialog.partnerId) : Promise.resolve())}
                disabled={busyPartnerId === deactivateDialog?.partnerId || !deactivationReason.trim()}
              >
                {busyPartnerId === deactivateDialog?.partnerId ? "Guardando..." : "Dar de baja asesor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PartnerRowActions({
  partner,
  busy,
  onViewDetail,
  onResendInvite,
  onCancelInvite,
  onToggleStatus,
  onDeactivate
}: {
  partner: AdminPartner;
  busy?: boolean;
  onViewDetail: () => void;
  onResendInvite?: () => void;
  onCancelInvite?: () => void;
  onToggleStatus?: () => void;
  onDeactivate?: () => void;
}) {
  const availability = getPartnerActionAvailability(partner);
  const toggleLabel = availability.nextStatus === "active" ? "Activar" : "Suspender";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 rounded-2xl border border-white/8 bg-white/5 p-0 text-white/82 hover:bg-white/10"
          aria-label="Abrir acciones del asesor"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[rgba(12,19,31,0.98)]">
        <DropdownMenuItem onClick={onViewDetail}>Ver detalle</DropdownMenuItem>
        <DropdownMenuItem disabled>Editar perfil · Proximamente</DropdownMenuItem>
        <DropdownMenuItem disabled>Ver clientes · Proximamente</DropdownMenuItem>
        <DropdownMenuItem disabled>Ver jerarquia · Proximamente</DropdownMenuItem>
        <DropdownMenuItem disabled={!availability.canResendInvite || busy} onClick={onResendInvite}>
          {busy ? "Procesando..." : "Reenviar invitacion"}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!availability.canCancelInvitation || busy} onClick={onCancelInvite}>
          {busy ? "Procesando..." : "Cancelar invitacion"}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!availability.canChangeStatus || busy} onClick={onToggleStatus}>
          {busy ? "Procesando..." : `${toggleLabel} asesor`}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!availability.canDeactivate || busy} onClick={onDeactivate}>
          {busy ? "Procesando..." : "Dar de baja asesor"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted/90">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function AttributionCard({ attribution }: { attribution: AdminPartnerAttribution }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[rgba(255,255,255,0.04)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{attribution.clinicName || attribution.tenantId || "Cliente atribuido"}</p>
          <p className="mt-1 text-xs text-muted/90">
            {attribution.attributionSource ? `${attribution.attributionSource} · ` : ""}
            {formatPartnerDateTime(attribution.attributedAt)}
          </p>
        </div>
        <Badge variant={String(attribution.status || "").toLowerCase() === "active" ? "success" : "muted"}>
          {String(attribution.status || "").toLowerCase() === "active" ? "Activa" : "No activa"}
        </Badge>
      </div>
      {attribution.notes ? <p className="mt-3 text-sm leading-6 text-muted/90">{attribution.notes}</p> : null}
    </div>
  );
}

function ActionHint({
  title,
  description,
  disabled = false
}: {
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        disabled
          ? "border-dashed border-white/10 bg-[rgba(255,255,255,0.03)] text-muted/90"
          : "border-white/8 bg-[rgba(255,255,255,0.05)] text-white"
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5">{description}</p>
    </div>
  );
}

export function PartnersAdminPrimaryAction() {
  return (
    <Button
      type="button"
      className="rounded-2xl"
      disabled={!PARTNERS_ADMIN_CREATE_ENABLED}
      title={PARTNERS_ADMIN_CREATE_TOOLTIP}
      onClick={() => window.dispatchEvent(new Event(OPEN_PARTNER_INVITE_EVENT))}
    >
      <UserPlus2 className="mr-2 h-4 w-4" />
      Nuevo asesor
    </Button>
  );
}
