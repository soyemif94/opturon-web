"use client";

import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Link2, Save, Trash2, Upload } from "lucide-react";
import { SimpleAvatar } from "@/components/app/simple-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalContactDetail } from "@/lib/api";

type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  profileImageUrl: string;
  whatsappPhone: string;
  taxId: string;
  taxCondition: string;
  companyName: string;
  notes: string;
};

function buildInitialState(contact: PortalContactDetail): ContactDraft {
  return {
    name: contact.name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    profileImageUrl: contact.profileImageUrl || "",
    whatsappPhone: contact.whatsappPhone || "",
    taxId: contact.taxId || "",
    taxCondition: contact.taxCondition || "",
    companyName: contact.companyName || "",
    notes: contact.notes || ""
  };
}

export function ContactEditor({ contact }: { contact: PortalContactDetail }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(buildInitialState(contact));
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.set("file", file, file.name || "contact-image");

      const response = await fetch("/api/app/catalog/image-upload", {
        method: "POST",
        body: formData
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.image?.url) {
        throw new Error(String(json?.error || "No se pudo subir la imagen."));
      }

      setDraft((current) => ({
        ...current,
        profileImageUrl: String(json.image.url || "")
      }));
      toast.success("Imagen subida", "La imagen ya quedo lista para el contacto.");
    } catch (error) {
      toast.error("No se pudo subir la imagen", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setUploadingImage(false);
    }
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.name.trim()) {
      toast.error("Nombre requerido", "Completa el nombre del contacto antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/app/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          profileImageUrl: draft.profileImageUrl.trim() || null,
          whatsappPhone: draft.whatsappPhone.trim() || null,
          taxId: draft.taxId.trim() || null,
          taxCondition: draft.taxCondition.trim() || null,
          companyName: draft.companyName.trim() || null,
          notes: draft.notes.trim() || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo actualizar el contacto."));
      }

      toast.success("Contacto actualizado", "Los datos ya quedaron guardados en el CRM.");
      router.push(`/app/contacts/${contact.id}`);
      router.refresh();
    } catch (error) {
      toast.error("No se pudo guardar el contacto", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submitContact}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_340px]">
        <div className="space-y-4">
          <SectionCard
            title="Identidad del cliente"
            description="Nombre, imagen y datos base para reconocer rapido el registro."
            badge="Principal"
          >
            <div className="grid gap-4 lg:grid-cols-[112px_minmax(0,1fr)]">
              <div className="rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-3">
                <div className="flex flex-col items-center gap-3">
                  <SimpleAvatar
                    src={draft.profileImageUrl}
                    name={draft.name || "Contacto"}
                    className="h-20 w-20 rounded-[22px] border border-[color:var(--border)] bg-brand/10 text-2xl text-brandBright"
                    fallbackClassName="bg-brand/10 text-brandBright"
                  />
                  <div className="flex w-full flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleImageUpload(event)} />
                    <Button type="button" variant="secondary" size="sm" className="w-full rounded-2xl" disabled={saving || uploadingImage} onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingImage ? "Subiendo..." : "Subir imagen"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full rounded-2xl text-red-300 hover:text-red-200"
                      onClick={() => setDraft((current) => ({ ...current, profileImageUrl: "" }))}
                      disabled={saving || uploadingImage || !draft.profileImageUrl.trim()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Quitar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <FieldBlock label="Nombre completo">
                    <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={saving} />
                  </FieldBlock>
                  <FieldBlock label="Empresa">
                    <Input value={draft.companyName} onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))} disabled={saving} />
                  </FieldBlock>
                </div>

                <div className="rounded-[20px] border border-[color:var(--border)] bg-bg/45 p-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
                    <Link2 className="h-3.5 w-3.5" />
                    <span>URL alternativa</span>
                  </div>
                  <Input
                    className="mt-3"
                    placeholder="https://..."
                    value={draft.profileImageUrl}
                    onChange={(event) => setDraft((current) => ({ ...current, profileImageUrl: event.target.value }))}
                    disabled={saving || uploadingImage}
                  />
                  <p className="mt-2 text-xs text-muted">Usa una URL solo si ya tienes la imagen alojada. La carga desde ordenador es la opcion principal.</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Contacto y canal"
            description="Datos para ubicar al cliente y mantener continuidad comercial."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <FieldBlock label="Email">
                <Input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={saving} />
              </FieldBlock>
              <FieldBlock label="WhatsApp">
                <Input value={draft.whatsappPhone} onChange={(event) => setDraft((current) => ({ ...current, whatsappPhone: event.target.value }))} disabled={saving} />
              </FieldBlock>
              <FieldBlock label="Telefono" className="md:col-span-2">
                <Input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={saving} />
              </FieldBlock>
            </div>
          </SectionCard>

          <SectionCard
            title="Datos fiscales y empresa"
            description="Informacion administrativa minima para mantener el CRM y billing ordenados."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <FieldBlock label="Documento fiscal">
                <Input value={draft.taxId} onChange={(event) => setDraft((current) => ({ ...current, taxId: event.target.value }))} disabled={saving} />
              </FieldBlock>
              <FieldBlock label="Condicion fiscal">
                <Input value={draft.taxCondition} onChange={(event) => setDraft((current) => ({ ...current, taxCondition: event.target.value }))} disabled={saving} />
              </FieldBlock>
            </div>
          </SectionCard>

          <SectionCard
            title="Notas internas"
            description="Observaciones del equipo. No visibles para el contacto."
          >
            <Textarea
              rows={5}
              placeholder="Escribe contexto comercial, acuerdos, temas pendientes o notas internas..."
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              disabled={saving}
              className="min-h-[140px]"
            />
          </SectionCard>
        </div>

        <div className="space-y-4">
          <Card className="border-white/6 bg-[linear-gradient(180deg,rgba(16,24,35,0.92),rgba(18,18,18,0.9))] shadow-[var(--card-shadow)]">
            <CardHeader className="pb-4">
              <div>
                <CardTitle className="text-xl">Lectura rapida</CardTitle>
                <CardDescription>Panel corto para validar el estado del registro antes de guardar.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="rounded-[20px] border border-[color:var(--border)] bg-surface/55 p-3.5">
                <div className="flex items-start gap-3">
                  <SimpleAvatar
                    src={draft.profileImageUrl}
                    name={draft.name || "Contacto"}
                    className="h-14 w-14 rounded-[18px] border border-[color:var(--border)] bg-brand/10 text-brandBright"
                    fallbackClassName="bg-brand/10 text-brandBright"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{draft.name || "Nuevo contacto"}</p>
                    <p className="mt-0.5 text-sm text-muted">{draft.phone || draft.whatsappPhone || draft.email || "Sin canal principal definido"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="success">Activo</Badge>
                      {draft.companyName.trim() ? <Badge variant="muted">{draft.companyName.trim()}</Badge> : null}
                    </div>
                  </div>
                </div>
              </div>

              <MiniInfo label="Canal principal" value={draft.whatsappPhone || draft.phone || draft.email || "Pendiente"} />
              <MiniInfo label="Documento fiscal" value={draft.taxId || "Sin dato"} />
              <MiniInfo label="Condicion fiscal" value={draft.taxCondition || "Sin dato"} />
            </CardContent>
          </Card>

          <Card className="sticky top-24 border-white/6 bg-[linear-gradient(180deg,rgba(22,27,35,0.96),rgba(18,18,18,0.94))] shadow-[var(--card-shadow)]">
            <CardHeader className="pb-4">
              <div>
                <CardTitle className="text-xl">Guardar cambios</CardTitle>
                <CardDescription>Confirma la edicion para volver al detalle del contacto.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              <Button type="submit" className="w-full rounded-2xl" disabled={saving || uploadingImage}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar contacto"}
              </Button>
              <Button type="button" variant="ghost" className="w-full rounded-2xl" onClick={() => router.push(`/app/contacts/${contact.id}`)} disabled={saving}>
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function SectionCard({
  title,
  description,
  badge,
  children
}: {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-white/6 bg-[linear-gradient(180deg,rgba(16,24,35,0.9),rgba(18,18,18,0.88))] shadow-[var(--card-shadow)]">
      <CardHeader action={badge ? <Badge variant="warning">{badge}</Badge> : null} className="pb-4">
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function FieldBlock({
  label,
  className = "",
  children
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-text">{label}</p>
      {children}
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-surface/55 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1.5 text-sm text-text">{value}</p>
    </div>
  );
}
