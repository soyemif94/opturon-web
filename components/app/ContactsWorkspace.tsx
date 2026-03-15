"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Building2, Mail, Phone, Plus, ReceiptText, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { PortalContactDetail } from "@/lib/api";
import { formatMoney, relativeDateLabel } from "@/lib/billing";

type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  whatsappPhone: string;
  companyName: string;
  taxId: string;
  notes: string;
};

const EMPTY_DRAFT: ContactDraft = {
  name: "",
  email: "",
  phone: "",
  whatsappPhone: "",
  companyName: "",
  taxId: "",
  notes: ""
};

export function ContactsWorkspace({
  initialContacts,
  readOnly = false
}: {
  initialContacts: PortalContactDetail[];
  readOnly?: boolean;
}) {
  const [contacts, setContacts] = useState(Array.isArray(initialContacts) ? initialContacts : []);
  const [selectedId, setSelectedId] = useState(initialContacts[0]?.id || "");
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => contacts.find((item) => item.id === selectedId) || contacts[0] || null,
    [contacts, selectedId]
  );

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    if (!draft.name.trim()) {
      toast.error("Nombre requerido", "El contacto necesita al menos un nombre.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/app/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          whatsappPhone: draft.whatsappPhone.trim() || null,
          companyName: draft.companyName.trim() || null,
          taxId: draft.taxId.trim() || null,
          notes: draft.notes.trim() || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No se pudo crear el contacto."));
      }

      const created = json?.contact as PortalContactDetail;
      setContacts((current) => [created, ...current]);
      setSelectedId(created.id);
      setDraft(EMPTY_DRAFT);
      toast.success("Contacto creado", "La base CRM ya quedo actualizada en el portal.");
    } catch (error) {
      toast.error("Error al crear contacto", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
      <Card className="border-white/6 bg-card/90">
        <CardHeader action={<Badge variant="muted">{contacts.length} contactos</Badge>}>
          <div>
            <CardTitle className="text-xl">Base de contactos</CardTitle>
            <CardDescription>Lista inicial de CRM para operar sin salir del portal.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!contacts.length ? (
            <EmptyState
              icon={<UserRound className="h-5 w-5" />}
              title="Todavia no hay contactos visibles"
              description="Crea el primero para empezar a vincular facturas, cobros y futuras conversaciones."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border)]">
              <div className="grid grid-cols-[minmax(0,1.2fr)_180px_210px_140px_160px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                <span>Contacto</span>
                <span>Empresa</span>
                <span>Senal financiera</span>
                <span>Estado</span>
                <span>Ultimo movimiento</span>
              </div>
              {contacts.map((contact) => {
                const active = selected?.id === contact.id;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedId(contact.id)}
                    className={`grid w-full grid-cols-[minmax(0,1.2fr)_180px_210px_140px_160px] gap-4 border-b border-[color:var(--border)] px-4 py-4 text-left transition-colors last:border-b-0 ${active ? "bg-brand/5" : "hover:bg-surface/40"}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{contact.name}</p>
                      <p className="mt-1 truncate text-sm text-muted">{contact.email || contact.phone || contact.whatsappPhone || "Sin datos de contacto"}</p>
                    </div>
                    <div className="flex items-center text-sm text-muted">{contact.companyName || "-"}</div>
                    <div className="flex items-center">
                      <FinancialSignalCell contact={contact} />
                    </div>
                    <div className="flex items-center">
                      <Badge variant={contact.status === "archived" ? "danger" : "success"}>{contact.status || "active"}</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      {relativeDateLabel(contact.updatedAt || contact.createdAt || contact.lastInteractionAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              selected ? (
                <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                  <Link href={`/app/contacts/${selected.id}`}>Abrir detalle</Link>
                </Button>
              ) : null
            }
          >
            <div>
              <CardTitle className="text-xl">Detalle basico</CardTitle>
              <CardDescription>Vista corta para validar identidad comercial y contexto del contacto.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {selected ? (
              <>
                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/60 p-4">
                  <p className="text-lg font-semibold">{selected.name}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant={selected.status === "archived" ? "danger" : "success"}>{selected.status || "active"}</Badge>
                    {selected.companyName ? <Badge variant="muted">{selected.companyName}</Badge> : null}
                    {selected.taxId ? <Badge variant="outline">CUIT/DNI {selected.taxId}</Badge> : null}
                  </div>
                </div>
                <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={selected.email || "-"} />
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Telefono" value={selected.phone || selected.whatsappPhone || "-"} />
                <DetailRow icon={<Building2 className="h-4 w-4" />} label="Empresa" value={selected.companyName || "-"} />
                <DetailRow icon={<ReceiptText className="h-4 w-4" />} label="Observaciones" value={selected.notes || "Sin notas"} multiline />
              </>
            ) : (
              <EmptyState
                icon={<UserRound className="h-5 w-5" />}
                title="Selecciona un contacto"
                description="Desde aca puedes revisar rapidamente los datos del registro activo."
                className="min-h-[220px]"
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={!readOnly ? <Badge variant="warning">Nuevo</Badge> : <Badge variant="muted">Solo lectura</Badge>}>
            <div>
              <CardTitle className="text-xl">Crear contacto</CardTitle>
              <CardDescription>Alta minima para empezar a usar CRM y billing desde el portal.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <form className="space-y-3" onSubmit={createContact}>
              <Input placeholder="Nombre completo" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} disabled={readOnly || saving} />
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} disabled={readOnly || saving} />
                <Input placeholder="Telefono" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} disabled={readOnly || saving} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="WhatsApp" value={draft.whatsappPhone} onChange={(event) => setDraft((current) => ({ ...current, whatsappPhone: event.target.value }))} disabled={readOnly || saving} />
                <Input placeholder="Empresa" value={draft.companyName} onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))} disabled={readOnly || saving} />
              </div>
              <Input placeholder="Documento fiscal" value={draft.taxId} onChange={(event) => setDraft((current) => ({ ...current, taxId: event.target.value }))} disabled={readOnly || saving} />
              <Textarea placeholder="Notas internas" rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} disabled={readOnly || saving} />
              <Button type="submit" className="w-full rounded-2xl" disabled={readOnly || saving}>
                <Plus className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Crear contacto"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FinancialSignalCell({ contact }: { contact: PortalContactDetail }) {
  const signal = contact.financialSignal;
  const outstanding = Number(signal?.outstandingAmount || 0);
  const unallocated = Number(signal?.unallocatedPayments || 0);

  if (outstanding > 0) {
    return (
      <div className="min-w-0">
        <Badge variant="warning">Con deuda</Badge>
        <p className="mt-1 truncate text-sm text-muted">Pendiente {formatMoney(outstanding)}</p>
      </div>
    );
  }

  if (unallocated > 0) {
    return (
      <div className="min-w-0">
        <Badge variant="muted">Pago libre</Badge>
        <p className="mt-1 truncate text-sm text-muted">{formatMoney(unallocated)} sin asignar</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Badge variant="success">Al dia</Badge>
      <p className="mt-1 truncate text-sm text-muted">Sin pendiente visible</p>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  multiline = false
}: {
  icon: ReactNode;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <p className={multiline ? "text-sm leading-6 text-muted" : "text-sm text-muted"}>{value}</p>
    </div>
  );
}
