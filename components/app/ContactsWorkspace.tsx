"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
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
import { SimpleAvatar } from "@/components/app/simple-avatar";

type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  profileImageUrl: string;
  whatsappPhone: string;
  companyName: string;
  taxId: string;
  notes: string;
};

const EMPTY_DRAFT: ContactDraft = {
  name: "",
  email: "",
  phone: "",
  profileImageUrl: "",
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
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialContacts[0]?.id || "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleContacts = useMemo(() => {
    if (!normalizedSearch) return contacts;

    return contacts.filter((contact) => {
      const haystack = [contact.name, contact.phone, contact.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [contacts, normalizedSearch]);

  const selected = useMemo(
    () => visibleContacts.find((item) => item.id === selectedId) || visibleContacts[0] || null,
    [visibleContacts, selectedId]
  );
  const allVisibleSelected = visibleContacts.length > 0 && visibleContacts.every((contact) => selectedIds.includes(contact.id));
  const showingArchived = viewMode === "archived";

  useEffect(() => {
    let cancelled = false;

    async function loadContacts() {
      setLoadingContacts(true);
      try {
        const response = await fetch(`/api/app/contacts?visibility=${viewMode}`, { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(String(json?.error || "contacts_list_failed"));
        if (cancelled) return;
        const nextContacts = Array.isArray(json?.contacts) ? (json.contacts as PortalContactDetail[]) : [];
        setContacts(nextContacts);
        setSelectedIds([]);
        setSearchQuery("");
        setSelectedId((current) => (current && nextContacts.some((contact) => contact.id === current) ? current : nextContacts[0]?.id || ""));
      } catch (error) {
        if (!cancelled) {
          toast.error("No se pudieron cargar los contactos", error instanceof Error ? error.message : "unknown_error");
        }
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [viewMode]);

  async function archiveSelectedContacts() {
    if (readOnly || selectedIds.length === 0 || archiving) return;

    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(`Se ocultaran ${selectedIds.length} contactos del panel. El historial comercial seguira preservado.`);
    if (!confirmed) return;

    setArchiving(true);
    try {
      const response = await fetch("/api/app/contacts/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedIds })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "contacts_archive_failed"));

      const archivedIds = Array.isArray(json?.archivedContactIds) ? json.archivedContactIds : selectedIds;
      const remaining = contacts.filter((contact) => !archivedIds.includes(contact.id));
      setContacts(remaining);
      setSelectedIds([]);
      if (selectedId && archivedIds.includes(selectedId)) {
        setSelectedId(remaining[0]?.id || "");
      }
      toast.success("Contactos ocultados", "Ya no aparecen en la base visible del panel.");
    } catch (error) {
      toast.error("No se pudieron ocultar los contactos", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setArchiving(false);
    }
  }

  async function restoreSelectedContacts() {
    if (readOnly || selectedIds.length === 0 || restoring) return;

    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(`Se restauraran ${selectedIds.length} contactos a la base activa.`);
    if (!confirmed) return;

    setRestoring(true);
    try {
      const response = await fetch("/api/app/contacts/restore", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedIds })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "contacts_restore_failed"));

      const restoredIds = Array.isArray(json?.restoredContactIds) ? json.restoredContactIds : selectedIds;
      const remaining = contacts.filter((contact) => !restoredIds.includes(contact.id));
      setContacts(remaining);
      setSelectedIds([]);
      if (selectedId && restoredIds.includes(selectedId)) {
        setSelectedId(remaining[0]?.id || "");
      }
      toast.success("Contactos restaurados", "Ya vuelven a aparecer en la base activa.");
    } catch (error) {
      toast.error("No se pudieron restaurar los contactos", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setRestoring(false);
    }
  }

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
          profileImageUrl: draft.profileImageUrl.trim() || null,
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
          <div className="mb-4 flex flex-wrap gap-2">
            <Button type="button" variant={showingArchived ? "ghost" : "secondary"} size="sm" className="rounded-2xl" onClick={() => setViewMode("active")}>
              Activos
            </Button>
            <Button type="button" variant={showingArchived ? "secondary" : "ghost"} size="sm" className="rounded-2xl" onClick={() => setViewMode("archived")}>
              Archivados
            </Button>
          </div>
          <div className="mb-4 rounded-2xl border border-[color:var(--border)] bg-surface/55 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {selectedIds.length > 0
                  ? `${selectedIds.length} contactos seleccionados`
                  : showingArchived
                    ? "Selecciona contactos archivados para restaurarlos a la base activa."
                    : "Selecciona contactos para ocultarlos del panel sin borrar historial."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-2xl"
                  onClick={() => setSelectedIds(allVisibleSelected ? [] : visibleContacts.map((contact) => contact.id))}
                  disabled={visibleContacts.length === 0}
                >
                  {allVisibleSelected ? "Limpiar visibles" : "Seleccionar visibles"}
                </Button>
                <Button
                  type="button"
                  variant={showingArchived ? "secondary" : "destructive"}
                  size="sm"
                  className="rounded-2xl"
                  onClick={() => void (showingArchived ? restoreSelectedContacts() : archiveSelectedContacts())}
                  disabled={readOnly || selectedIds.length === 0 || archiving || restoring}
                >
                  {showingArchived ? restoring ? "Restaurando..." : "Restaurar seleccionados" : archiving ? "Ocultando..." : "Ocultar seleccionados"}
                </Button>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por nombre o teléfono"
              aria-label="Buscar contactos"
            />
          </div>

          {!visibleContacts.length && !loadingContacts ? (
            <EmptyState
              icon={<UserRound className="h-5 w-5" />}
              title={
                contacts.length > 0 && normalizedSearch
                  ? "No encontramos contactos para esa búsqueda"
                  : showingArchived
                    ? "Todavia no hay contactos archivados"
                    : "Todavia no hay contactos visibles"
              }
              description={
                contacts.length > 0 && normalizedSearch
                  ? "Probá con otro nombre, teléfono o email."
                  : showingArchived
                    ? "Cuando archives contactos desde la vista activa, vas a poder restaurarlos desde aca."
                    : "Crea el primero para empezar a vincular facturas, cobros y futuras conversaciones."
              }
            />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-[color:var(--border)] md:block">
              <div className="grid grid-cols-[32px_minmax(0,1.2fr)_180px_210px_140px_160px] gap-4 border-b border-[color:var(--border)] bg-surface/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted">
                <span />
                <span>Contacto</span>
                <span>Empresa</span>
                <span>Senal financiera</span>
                <span>Estado</span>
                <span>Ultimo movimiento</span>
              </div>
              {visibleContacts.map((contact) => {
                const active = selected?.id === contact.id;
                return (
                  <div
                    key={contact.id}
                    className={`grid w-full grid-cols-[32px_minmax(0,1.2fr)_180px_210px_140px_160px] gap-4 border-b border-[color:var(--border)] px-4 py-4 text-left transition-colors last:border-b-0 ${active ? "bg-brand/5" : "hover:bg-surface/40"}`}
                  >
                    <label
                      className="inline-flex items-center"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(contact.id)}
                        onChange={() =>
                          setSelectedIds((current) =>
                            current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id]
                          )
                        }
                        disabled={readOnly}
                        className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--brand)]"
                        aria-label={`Seleccionar contacto ${contact.name}`}
                      />
                    </label>
                    <button type="button" onClick={() => setSelectedId(contact.id)} className="flex min-w-0 items-center gap-3 text-left">
                      <SimpleAvatar
                        src={contact.profileImageUrl}
                        name={contact.name}
                        className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-brand/10 text-brandBright"
                        fallbackClassName="bg-brand/10 text-brandBright"
                      />
                      <span className="min-w-0">
                        <p className="truncate font-medium">{contact.name}</p>
                        <p className="mt-1 truncate text-sm text-muted">{contact.email || contact.phone || contact.whatsappPhone || "Sin datos de contacto"}</p>
                      </span>
                    </button>
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
                  </div>
                );
              })}
              </div>
              <div className="space-y-3 md:hidden">
                {visibleContacts.map((contact) => {
                  const active = selected?.id === contact.id;
                  return (
                    <div
                      key={contact.id}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${active ? "border-brand/35 bg-brand/5" : "border-[color:var(--border)] bg-surface/55 hover:bg-surface/40"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(contact.id)}
                            onChange={() =>
                              setSelectedIds((current) =>
                                current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id]
                              )
                            }
                            disabled={readOnly}
                            className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--brand)]"
                            aria-label={`Seleccionar contacto ${contact.name}`}
                          />
                        </label>
                        <button type="button" onClick={() => setSelectedId(contact.id)} className="flex min-w-0 items-center gap-3 text-left">
                          <SimpleAvatar
                            src={contact.profileImageUrl}
                            name={contact.name}
                            className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-brand/10 text-brandBright"
                            fallbackClassName="bg-brand/10 text-brandBright"
                          />
                          <span className="min-w-0">
                            <p className="truncate font-medium">{contact.name}</p>
                            <p className="mt-1 text-sm text-muted">{contact.email || contact.phone || contact.whatsappPhone || "Sin datos de contacto"}</p>
                          </span>
                        </button>
                        <Badge variant={contact.status === "archived" ? "danger" : "success"}>{contact.status || "active"}</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                        <p>Empresa: {contact.companyName || "-"}</p>
                        <p>Movimiento: {relativeDateLabel(contact.updatedAt || contact.createdAt || contact.lastInteractionAt)}</p>
                      </div>
                      <div className="mt-3">
                        <FinancialSignalCell contact={contact} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              selected ? (
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  {!readOnly ? (
                    <Button asChild variant="secondary" size="sm" className="w-full rounded-2xl sm:w-auto">
                      <Link href={`/app/contacts/${selected.id}/edit`}>Editar</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="secondary" size="sm" className="w-full rounded-2xl sm:w-auto">
                    <Link href={`/app/contacts/${selected.id}`}>Abrir detalle</Link>
                  </Button>
                </div>
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
                  <div className="flex items-start gap-4">
                    <SimpleAvatar
                      src={selected.profileImageUrl}
                      name={selected.name}
                      className="h-16 w-16 rounded-[22px] border border-[color:var(--border)] bg-brand/10 text-lg text-brandBright"
                      fallbackClassName="bg-brand/10 text-brandBright"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">{selected.name}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={selected.status === "archived" ? "danger" : "success"}>{selected.status || "active"}</Badge>
                        {selected.companyName ? <Badge variant="muted">{selected.companyName}</Badge> : null}
                        {selected.taxId ? <Badge variant="outline">CUIT/DNI {selected.taxId}</Badge> : null}
                      </div>
                    </div>
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
              <Input
                placeholder="URL de imagen de perfil"
                value={draft.profileImageUrl}
                onChange={(event) => setDraft((current) => ({ ...current, profileImageUrl: event.target.value }))}
                disabled={readOnly || saving}
              />
              {draft.profileImageUrl.trim() ? (
                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">Preview</p>
                  <div className="mt-3 flex items-center gap-3">
                    <SimpleAvatar
                      src={draft.profileImageUrl}
                      name={draft.name || "Nuevo contacto"}
                      className="h-14 w-14 rounded-[18px] border border-[color:var(--border)] bg-brand/10 text-brandBright"
                      fallbackClassName="bg-brand/10 text-brandBright"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-2xl"
                      onClick={() => setDraft((current) => ({ ...current, profileImageUrl: "" }))}
                      disabled={readOnly || saving}
                    >
                      Quitar imagen
                    </Button>
                  </div>
                </div>
              ) : null}
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
