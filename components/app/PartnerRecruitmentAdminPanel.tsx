"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/ui/cn";

type RecruitmentStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "invitation_sent"
  | "invitation_accepted"
  | "rejected"
  | "cancelled"
  | "expired";

type RecruitmentApplication = {
  id: string;
  status: RecruitmentStatus;
  fullName: string;
  email: string;
  phone: string;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  documentId?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  createdAt?: string | null;
  submittedAt?: string | null;
  updatedAt?: string | null;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  sponsor?: {
    id: string;
    displayName?: string | null;
    status?: string | null;
  };
  invitationId?: string | null;
  createdPartnerId?: string | null;
  createdPartner?: {
    id: string;
    displayName?: string | null;
    email?: string | null;
    status?: string | null;
  } | null;
};

type RecruitmentResponse = {
  data?: {
    applications?: RecruitmentApplication[];
    application?: RecruitmentApplication;
    duplicateWarnings?: string[];
  };
  duplicateWarnings?: string[];
  error?: string;
  detail?: string;
};

function canRequestCorrectionFromApproved(application: RecruitmentApplication | null) {
  return Boolean(application && application.status === "approved" && !application.invitationId && !application.createdPartnerId);
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "pending_review", label: "Pendiente de revision" },
  { value: "changes_requested", label: "Correccion solicitada" },
  { value: "approved", label: "Aprobada" },
  { value: "approved_pending_invitation", label: "Aprobadas pendientes de invitacion" },
  { value: "invitation_sent", label: "Invitacion enviada" },
  { value: "invitation_accepted", label: "Incorporado" },
  { value: "rejected", label: "Rechazada" },
  { value: "cancelled", label: "Cancelada" }
];

const STATUS_LABELS: Record<RecruitmentStatus, string> = {
  draft: "Borrador",
  pending_review: "Pendiente de revision",
  changes_requested: "Correccion solicitada",
  approved: "Aprobada",
  invitation_sent: "Invitacion enviada",
  invitation_accepted: "Incorporado",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  expired: "Invitacion vencida"
};

function statusVariant(status: RecruitmentStatus) {
  if (status === "approved" || status === "invitation_accepted") return "success" as const;
  if (status === "pending_review" || status === "invitation_sent") return "warning" as const;
  if (status === "rejected" || status === "cancelled" || status === "expired") return "danger" as const;
  if (status === "changes_requested") return "outline" as const;
  return "muted" as const;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sin registro";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Sin registro";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(parsed));
}

function mapError(payload: RecruitmentResponse | null, fallback = "No pudimos cargar las postulaciones.") {
  const code = String(payload?.detail || payload?.error || "").trim();
  switch (code) {
    case "admin_notes_required":
      return "Debes cargar un motivo para rechazar o solicitar correccion.";
    case "partner_recruitment_application_not_approved":
      return "No puedes enviar invitacion antes de aprobar la postulacion.";
    case "invalid_partner_recruitment_transition":
      return "La postulacion cambio de estado. Actualiza la bandeja.";
    case "recruitment_duplicate_phone":
      return "No se pudo enviar la invitacion porque el telefono coincide con una cuenta existente. Solicita una correccion al asesor.";
    case "recruitment_duplicate_email":
      return "No se pudo enviar la invitacion porque el email coincide con una cuenta existente. Solicita una correccion al asesor.";
    case "recruitment_duplicate_document":
      return "No se pudo enviar la invitacion porque el documento coincide con otra postulacion activa. Solicita una correccion al asesor.";
    case "recruitment_duplicate_invitation":
      return "No se pudo enviar la invitacion porque ya existe una invitacion pendiente para esta persona.";
    default:
      return code || fallback;
  }
}

export function PartnerRecruitmentAdminPanel({ panelClass, toolbarFieldClass }: { panelClass: string; toolbarFieldClass: string }) {
  const [items, setItems] = useState<RecruitmentApplication[]>([]);
  const [selected, setSelected] = useState<RecruitmentApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState("pending_review");
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);

  async function readJson(response: Response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as RecruitmentResponse | null;
    } catch {
      return null;
    }
  }

  async function loadList() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "all" && status !== "approved_pending_invitation") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/app/admin/partners/recruitment-applications?${params.toString()}`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(mapError(payload));
      let next = Array.isArray(payload?.data?.applications) ? payload.data?.applications || [] : [];
      if (status === "approved_pending_invitation") {
        next = next.filter((item) => item.status === "approved" && !item.invitationId && !item.createdPartnerId);
      }
      setItems(next);
      if (selected) {
        const refreshed = next.find((item) => item.id === selected.id) || null;
        if (refreshed) {
          await loadDetail(refreshed.id, false);
        } else {
          setSelected(null);
        }
      }
    } catch (loadError) {
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar las postulaciones.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string, resetReason = true) {
    try {
      const response = await fetch(`/api/app/admin/partners/recruitment-applications/${encodeURIComponent(id)}`, {
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await readJson(response);
      if (!response.ok || !payload?.data?.application) throw new Error(mapError(payload, "No pudimos cargar el detalle."));
      setSelected(payload.data.application);
      setDuplicateWarnings(payload.data.duplicateWarnings || []);
      if (resetReason) setReason(payload.data.application.adminNotes || "");
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "No pudimos cargar el detalle.");
    }
  }

  useEffect(() => {
    void loadList();
  }, [status]);

  async function review(id: string, action: "approve" | "request-changes" | "reject" | "send-invitation") {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    try {
      const path = `/api/app/admin/partners/recruitment-applications/${encodeURIComponent(id)}/${action}`;
      const response = await fetch(path, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: action === "approve" || action === "send-invitation" ? JSON.stringify({}) : JSON.stringify({ adminNotes: reason.trim() })
      });
      const payload = await readJson(response);
      if (!response.ok) {
        setDuplicateWarnings(payload?.duplicateWarnings || payload?.data?.duplicateWarnings || []);
        throw new Error(mapError(payload, "No pudimos resolver la postulacion."));
      }
      await loadList();
      await loadDetail(id, action !== "send-invitation");
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "No pudimos resolver la postulacion.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className={cn("overflow-hidden", panelClass)}>
      <CardHeader className="gap-4 border-b border-white/8 pb-4">
        <div>
          <CardTitle className="text-xl text-white">Postulaciones de asesores</CardTitle>
          <CardDescription className="text-sm text-muted/90">
            Solicitudes enviadas por asesores patrocinadores, separadas de invitaciones directas y de la red ya activa.
          </CardDescription>
        </div>
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
          <select aria-label="Filtrar postulaciones" value={status} onChange={(event) => setStatus(event.target.value)} className={toolbarFieldClass}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar sponsor, postulante, email, telefono o documento"
            className={toolbarFieldClass}
          />
          <Button type="button" variant="secondary" className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10" onClick={() => void loadList()} disabled={loading}>
            <RefreshCcw className={cn("mr-2 h-4 w-4", loading ? "animate-spin" : "")} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-5 text-sm text-muted/90">Cargando postulaciones...</div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<BadgeCheck />}
              title="Sin postulaciones para revisar"
              description="Cuando un asesor patrocine una postulacion, aparecera en esta bandeja."
            />
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07]",
                  selected?.id === item.id ? "ring-1 ring-brand/50" : ""
                )}
                onClick={() => void loadDetail(item.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.fullName}</p>
                    <p className="mt-1 text-xs text-muted/90">{item.email}</p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted/90 md:grid-cols-3">
                  <span>Sponsor: {item.sponsor?.displayName || "Sin sponsor"}</span>
                  <span>{item.phone}</span>
                  <span>{formatDateTime(item.submittedAt || item.createdAt)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.04)] p-4">
          {selected ? (
            <div className="grid gap-4">
              <div>
                <Badge variant={statusVariant(selected.status)}>{STATUS_LABELS[selected.status]}</Badge>
                <h3 className="mt-3 text-lg font-semibold text-white">{selected.fullName}</h3>
                <p className="mt-1 text-sm text-muted/90">{selected.email}</p>
              </div>
              <div className="grid gap-2">
                <InfoRow label="Sponsor" value={selected.sponsor?.displayName || "Sin sponsor"} />
                <InfoRow label="Estado sponsor" value={selected.sponsor?.status || "Sin dato"} />
                <InfoRow label="Telefono" value={selected.phone} />
                <InfoRow label="Documento" value={selected.documentId || "No informado"} />
                <InfoRow label="Ciudad" value={selected.city || "No informada"} />
                <InfoRow label="Provincia" value={selected.province || "No informada"} />
                <InfoRow label="Observacion sponsor" value={selected.notes || "Sin observaciones"} />
                <InfoRow label="Observacion admin" value={selected.adminNotes || "Sin observaciones"} />
                <InfoRow label="Invitacion asociada" value={selected.invitationId || "Todavia no enviada"} />
                <InfoRow label="Asesor creado" value={selected.createdPartner?.displayName || selected.createdPartner?.email || "Todavia no creado"} />
                <InfoRow label="Aceptacion" value={formatDateTime(selected.acceptedAt)} />
              </div>
              {canRequestCorrectionFromApproved(selected) ? (
                <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100">
                  Aprobada pendiente de invitacion. Si detectas un conflicto corregible, solicita correccion para volver a revision sin crear otra postulacion.
                </div>
              ) : null}
              {duplicateWarnings.length > 0 ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  {duplicateWarnings.join(" ")}
                </div>
              ) : null}
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <label className="grid gap-2 text-sm text-muted/90">
                Motivo administrativo
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="min-h-24 rounded-2xl border border-white/12 bg-[rgba(10,17,29,0.72)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Obligatorio para rechazar o solicitar correccion."
                />
              </label>
              <div className="grid gap-2">
                <Button type="button" className="rounded-2xl" onClick={() => void review(selected.id, "approve")} disabled={busyId === selected.id || selected.status !== "pending_review"}>
                  Aprobar postulacion
                </Button>
                <Button type="button" variant="secondary" className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10" onClick={() => void review(selected.id, "request-changes")} disabled={busyId === selected.id || (!reason.trim()) || !(selected.status === "pending_review" || canRequestCorrectionFromApproved(selected))}>
                  Solicitar correccion
                </Button>
                <Button type="button" variant="destructive" className="rounded-2xl" onClick={() => void review(selected.id, "reject")} disabled={busyId === selected.id || (selected.status !== "pending_review" && selected.status !== "approved") || !reason.trim()}>
                  Rechazar postulacion
                </Button>
                <Button type="button" className="rounded-2xl" onClick={() => void review(selected.id, "send-invitation")} disabled={busyId === selected.id || selected.status !== "approved"}>
                  Enviar invitacion
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<ShieldCheck />}
              title="Selecciona una postulacion"
              description="Aqui vas a ver sponsor, detalle, advertencias y acciones de revision."
            />
          )}
        </div>
      </CardContent>
    </Card>
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
