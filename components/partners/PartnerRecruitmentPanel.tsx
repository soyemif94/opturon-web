"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BadgeCheck, Loader2, UserPlus2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

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
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  documentId?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  notes?: string | null;
  adminNotes?: string | null;
  invitationId?: string | null;
  createdPartnerId?: string | null;
  createdAt?: string | null;
  submittedAt?: string | null;
  updatedAt?: string | null;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  createdPartner?: {
    id: string;
    displayName?: string | null;
    email?: string | null;
  } | null;
};

type ApplicationsResponse = {
  data?: {
    applications?: RecruitmentApplication[];
    application?: RecruitmentApplication;
    duplicateWarnings?: string[];
  };
  duplicateWarnings?: string[];
  error?: string;
  traceId?: string;
};

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
  if (status === "invitation_accepted" || status === "approved") return "success" as const;
  if (status === "pending_review" || status === "invitation_sent") return "warning" as const;
  if (status === "rejected" || status === "cancelled" || status === "expired") return "danger" as const;
  if (status === "changes_requested") return "outline" as const;
  return "muted" as const;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sin dato";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Sin dato";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(parsed));
}

function mapRecruitmentError(code?: string | null) {
  switch (String(code || "").trim()) {
    case "partner_recruitment_application_already_active":
    case "partner_recruitment_phone_already_active":
    case "partner_recruitment_document_already_active":
      return "Ya existe una postulacion activa para esta persona.";
    case "recruitment_duplicate_phone":
      return "No se pudo enviar la invitacion porque el telefono coincide con una cuenta existente.";
    case "recruitment_duplicate_email":
      return "No se pudo enviar la invitacion porque el email coincide con una cuenta existente.";
    case "recruitment_duplicate_document":
      return "No se pudo enviar la invitacion porque el documento coincide con otra postulacion activa.";
    case "recruitment_duplicate_invitation":
      return "No se pudo enviar la invitacion porque ya existe una invitacion pendiente para esta persona.";
    case "partner_email_already_exists":
      return "Esta persona ya posee una cuenta de asesor.";
    case "partner_identity_invalid":
    case "partner_not_found":
      return "No pudimos identificar tu cuenta de asesor.";
    case "invalid_partner_recruitment_transition":
      return "La postulacion cambio de estado. Actualiza la bandeja.";
    case "recruitment_consent_required":
      return "Debes confirmar el consentimiento antes de enviar.";
    case "partner_sponsor_browser_override_forbidden":
      return "El sponsor se toma siempre desde tu sesion.";
    default:
      return "No pudimos completar la postulacion.";
  }
}

function formatRecruitmentError(payload?: ApplicationsResponse | null) {
  const message = mapRecruitmentError(payload?.error);
  if (message === "No pudimos completar la postulacion." && payload?.traceId) {
    return `${message} Intenta nuevamente. Codigo de seguimiento: ${payload.traceId}`;
  }
  return message;
}

function initialForm() {
  return {
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    documentId: "",
    city: "",
    province: "",
    country: "Argentina",
    notes: "",
    consentConfirmed: false
  };
}

export function PartnerRecruitmentPanel() {
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
  const [form, setForm] = useState(initialForm);

  const activeApplications = useMemo(
    () => applications.filter((application) => application.status !== "invitation_accepted"),
    [applications]
  );

  async function readJson(response: Response) {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as ApplicationsResponse | null;
    } catch {
      return null;
    }
  }

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/partners/me/recruitment-applications", { cache: "no-store" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(mapRecruitmentError(payload?.error));
      setApplications(Array.isArray(payload?.data?.applications) ? payload.data?.applications || [] : []);
    } catch (loadError) {
      setApplications([]);
      setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tus postulaciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  function resetForm() {
    setForm(initialForm());
    setDuplicateWarnings([]);
  }

  function openCreateForm() {
    resetForm();
    setOpen(true);
    setMessage(null);
    setError(null);
  }

  function openEditForm(application: RecruitmentApplication) {
    setForm({
      id: application.id,
      firstName: application.firstName || "",
      lastName: application.lastName || "",
      email: application.email || "",
      phone: application.phone || "",
      documentId: application.documentId || "",
      city: application.city || "",
      province: application.province || "",
      country: application.country || "Argentina",
      notes: application.notes || "",
      consentConfirmed: true
    });
    setDuplicateWarnings([]);
    setOpen(true);
    setMessage(null);
    setError(null);
  }

  function canReopenApproved(application: RecruitmentApplication) {
    return application.status === "approved" && !application.invitationId && !application.createdPartnerId;
  }

  async function reopenForEdit(application: RecruitmentApplication) {
    if (busy) return;
    const confirmed = window.confirm("Al modificar una postulacion aprobada, volvera a revision de Administracion.");
    if (!confirmed) return;
    setBusy(application.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/partners/me/recruitment-applications/${encodeURIComponent(application.id)}/reopen-for-edit`,
        {
          method: "POST",
          cache: "no-store"
        }
      );
      const payload = await readJson(response);
      if (!response.ok || !payload?.data?.application) throw new Error(formatRecruitmentError(payload));
      openEditForm(payload.data.application);
      await loadApplications();
    } catch (reopenError) {
      setError(reopenError instanceof Error ? reopenError.message : "No pudimos reabrir la postulacion.");
    } finally {
      setBusy(null);
    }
  }

  async function saveAndSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(form.id || "create");
    setError(null);
    setMessage(null);
    setDuplicateWarnings([]);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        documentId: form.documentId.trim() || undefined,
        city: form.city.trim() || undefined,
        province: form.province.trim() || undefined,
        country: form.country.trim() || "Argentina",
        notes: form.notes.trim() || undefined,
        consentConfirmed: form.consentConfirmed
      };

      const saveResponse = await fetch(
        form.id
          ? `/api/partners/me/recruitment-applications/${encodeURIComponent(form.id)}`
          : "/api/partners/me/recruitment-applications",
        {
          method: form.id ? "PATCH" : "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      const savePayload = await readJson(saveResponse);
      if (!saveResponse.ok) {
        setDuplicateWarnings(savePayload?.duplicateWarnings || savePayload?.data?.duplicateWarnings || []);
        throw new Error(formatRecruitmentError(savePayload));
      }

      const applicationId = savePayload?.data?.application?.id;
      if (!applicationId) throw new Error("No pudimos guardar la postulacion.");

      const submitResponse = await fetch(
        `/api/partners/me/recruitment-applications/${encodeURIComponent(applicationId)}/submit`,
        {
          method: "POST",
          cache: "no-store"
        }
      );
      const submitPayload = await readJson(submitResponse);
      if (!submitResponse.ok) {
        setDuplicateWarnings(submitPayload?.duplicateWarnings || submitPayload?.data?.duplicateWarnings || []);
        throw new Error(formatRecruitmentError(submitPayload));
      }

      setOpen(false);
      resetForm();
      setMessage(form.id ? "Postulacion corregida y reenviada a revision." : "Postulacion enviada a revision.");
      await loadApplications();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No pudimos guardar la postulacion.");
    } finally {
      setBusy(null);
    }
  }

  async function cancelApplication(applicationId: string) {
    if (busy) return;
    setBusy(applicationId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/partners/me/recruitment-applications/${encodeURIComponent(applicationId)}/cancel`, {
        method: "POST",
        cache: "no-store"
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(mapRecruitmentError(payload?.error));
      setMessage("Postulacion cancelada.");
      await loadApplications();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "No pudimos cancelar la postulacion.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="grid gap-4">
      <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,20,36,0.92),rgba(9,18,33,0.84))] text-slate-100 shadow-[0_22px_70px_rgba(2,8,23,0.35)]">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl text-white">Postulaciones enviadas</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-slate-400">
              Invita un nuevo asesor sin exponer sponsor editable y manteniendo separada la red ya activa.
            </CardDescription>
          </div>
          <Button type="button" className="rounded-2xl" onClick={openCreateForm}>
            <UserPlus2 className="mr-2 h-4 w-4" />
            Invitar nuevo asesor
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {open ? (
            <form className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4" onSubmit={saveAndSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre *" value={form.firstName} onChange={(value) => setForm((current) => ({ ...current, firstName: value }))} />
                <Field label="Apellido *" value={form.lastName} onChange={(value) => setForm((current) => ({ ...current, lastName: value }))} />
                <Field label="Email *" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
                <Field label="Telefono *" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
                <Field label="DNI o documento" value={form.documentId} onChange={(value) => setForm((current) => ({ ...current, documentId: value }))} />
                <Field label="Ciudad" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
                <Field label="Provincia" value={form.province} onChange={(value) => setForm((current) => ({ ...current, province: value }))} />
                <Field label="Pais" value={form.country} onChange={(value) => setForm((current) => ({ ...current, country: value }))} />
              </div>
              <label className="grid gap-2 text-sm text-slate-300">
                Comentario o referencia
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-24 rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-300/45 focus:ring-2 focus:ring-amber-300/20"
                />
              </label>
              <label className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.consentConfirmed}
                  onChange={(event) => setForm((current) => ({ ...current, consentConfirmed: event.target.checked }))}
                  className="mt-1"
                />
                <span>Confirmo que conozco a esta persona y que autorizo que Opturon la contacte.</span>
              </label>
              {duplicateWarnings.length > 0 ? (
                <div className="rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  {duplicateWarnings.join(" ")}
                </div>
              ) : null}
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10" onClick={() => setOpen(false)} disabled={Boolean(busy)}>
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-2xl" disabled={Boolean(busy)}>
                  {busy ? "Guardando..." : "Guardar y enviar a revision"}
                </Button>
              </div>
            </form>
          ) : null}

          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          {error && !open ? <p className="text-sm text-rose-300">{error}</p> : null}

          {loading ? (
            <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando postulaciones...
            </div>
          ) : activeApplications.length === 0 ? (
            <EmptyState
              icon={<AlertCircle className="h-5 w-5" />}
              title="Todavia no enviaste postulaciones"
              description="Cuando envies una postulacion a revision, la vas a ver aqui con su estado real."
              className="min-h-[220px] border-white/10 bg-white/[0.03] text-slate-100"
            />
          ) : (
            <div className="grid gap-3">
              {activeApplications.map((application) => {
                const canEdit = application.status === "draft" || application.status === "changes_requested";
                const canCorrectApproved = canReopenApproved(application);
                const canCancel = application.status === "draft" || application.status === "changes_requested" || application.status === "pending_review";
                return (
                  <div key={application.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{application.fullName || `${application.firstName} ${application.lastName}`.trim()}</p>
                        <p className="mt-1 text-xs text-slate-400">{application.email}</p>
                      </div>
                      <Badge variant={statusVariant(application.status)}>{STATUS_LABELS[application.status]}</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-2 xl:grid-cols-5">
                      <Detail label="Presentacion" value={formatDateTime(application.submittedAt || application.createdAt)} />
                      <Detail label="Actualizacion" value={formatDateTime(application.updatedAt)} />
                      <Detail label="Telefono" value={application.phone} />
                      <Detail label="Ciudad" value={application.city || "No informada"} />
                      <Detail label="Pais" value={application.country || "Argentina"} />
                    </div>
                    {application.adminNotes ? (
                      <div className="mt-4 rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                        Observacion admin: {application.adminNotes}
                      </div>
                    ) : null}
                    {canCorrectApproved ? (
                      <div className="mt-4 rounded-[18px] border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100">
                        Aprobada. Pendiente de envio de invitacion. Si necesitas corregir datos, volvera a revision administrativa.
                      </div>
                    ) : null}
                    {application.createdPartner?.displayName || application.createdPartner?.email ? (
                      <div className="mt-4 rounded-[18px] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                        Nuevo asesor: {application.createdPartner?.displayName || application.createdPartner?.email}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {canEdit ? (
                        <Button type="button" variant="secondary" className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10" onClick={() => openEditForm(application)} disabled={busy === application.id}>
                          Editar
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <Button type="button" className="rounded-2xl" onClick={() => openEditForm(application)} disabled={busy === application.id}>
                          Reenviar
                        </Button>
                      ) : null}
                      {canCancel ? (
                        <Button type="button" variant="destructive" className="rounded-2xl" onClick={() => void cancelApplication(application.id)} disabled={busy === application.id}>
                          {busy === application.id ? "Cancelando..." : "Cancelar"}
                        </Button>
                      ) : null}
                      {canCorrectApproved ? (
                        <Button type="button" variant="secondary" className="rounded-2xl border-white/12 bg-white/6 text-white hover:bg-white/10" onClick={() => void reopenForEdit(application)} disabled={busy === application.id}>
                          {busy === application.id ? "Reabriendo..." : "Corregir datos"}
                        </Button>
                      ) : null}
                      {!canEdit && !canCancel && !canCorrectApproved ? (
                        <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
                          <BadgeCheck className="h-4 w-4" />
                          Solo lectura
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      {label}
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-100">{value}</p>
    </div>
  );
}
