"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalContactDetail } from "@/lib/api";
import { SimpleAvatar } from "@/components/app/simple-avatar";

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
  const [draft, setDraft] = useState<ContactDraft>(buildInitialState(contact));
  const [saving, setSaving] = useState(false);

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
    <form className="space-y-6" onSubmit={submitContact}>
      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="warning">Editable</Badge>}>
          <div>
            <CardTitle className="text-xl">Editar contacto</CardTitle>
            <CardDescription>Actualiza datos comerciales y fiscales sin salir del portal.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
          <div className="md:col-span-2 flex items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
            <SimpleAvatar
              src={draft.profileImageUrl}
              name={draft.name || "Contacto"}
              className="h-16 w-16 rounded-[22px] border border-[color:var(--border)] bg-brand/10 text-lg text-brandBright"
              fallbackClassName="bg-brand/10 text-brandBright"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <Input
                placeholder="URL de imagen de perfil"
                value={draft.profileImageUrl}
                onChange={(event) => setDraft((current) => ({ ...current, profileImageUrl: event.target.value }))}
                disabled={saving}
              />
              <div className="flex justify-start">
                <Button type="button" variant="ghost" size="sm" className="rounded-2xl" onClick={() => setDraft((current) => ({ ...current, profileImageUrl: "" }))} disabled={saving}>
                  Quitar imagen
                </Button>
              </div>
            </div>
          </div>
          <Input placeholder="Nombre completo" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={saving} />
          <Input placeholder="Empresa" value={draft.companyName} onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))} disabled={saving} />
          <Input placeholder="Email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={saving} />
          <Input placeholder="Telefono" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={saving} />
          <Input placeholder="WhatsApp" value={draft.whatsappPhone} onChange={(event) => setDraft((current) => ({ ...current, whatsappPhone: event.target.value }))} disabled={saving} />
          <Input placeholder="CUIT, CUIL o documento" value={draft.taxId} onChange={(event) => setDraft((current) => ({ ...current, taxId: event.target.value }))} disabled={saving} />
          <Input
            placeholder="Condicion fiscal"
            value={draft.taxCondition}
            onChange={(event) => setDraft((current) => ({ ...current, taxCondition: event.target.value }))}
            disabled={saving}
          />
          <div />
          <Textarea
            className="md:col-span-2"
            rows={5}
            placeholder="Notas internas"
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            disabled={saving}
          />
        </CardContent>
      </Card>

      <Card className="border-white/6 bg-card/90">
        <CardHeader>
          <div>
            <CardTitle className="text-xl">Guardar cambios</CardTitle>
            <CardDescription>Cuando termines, vuelve al detalle para seguir operando con el contacto.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Button type="submit" className="w-full rounded-2xl" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar contacto"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
