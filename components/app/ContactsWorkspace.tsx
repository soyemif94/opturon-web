"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Building2, Clock3, Filter, Mail, MessageSquareMore, Phone, Plus, ReceiptText, Search, UserRound, WalletCards } from "lucide-react";
import { SimpleAvatar } from "@/components/app/simple-avatar";
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
  profileImageUrl: string;
  whatsappPhone: string;
  companyName: string;
  taxId: string;
  notes: string;
};

type ListFilter = "all" | "recent" | "attention" | "quiet" | "conversation";
type SortMode = "recent" | "activity" | "name" | "attention";
type SurfaceTone = "orange" | "amber" | "green" | "violet" | "sky";

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

const FILTERS: Array<{ id: ListFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "recent", label: "Activos" },
  { id: "attention", label: "Atencion" },
  { id: "quiet", label: "Sin movimiento" },
  { id: "conversation", label: "Con conversaciones" }
];

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
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const showingArchived = viewMode === "archived";
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const visibleContacts = useMemo(() => {
    const filteredBySearch = normalizedSearch
      ? contacts.filter((contact) => {
          const haystack = [contact.name, contact.phone, contact.email, contact.companyName, contact.whatsappPhone]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedSearch);
        })
      : contacts;

    return filteredBySearch
      .filter((contact) => matchesListFilter(contact, listFilter))
      .sort((left, right) => compareContacts(left, right, sortMode));
  }, [contacts, listFilter, normalizedSearch, sortMode]);

  const selected = useMemo(
    () => visibleContacts.find((item) => item.id === selectedId) || visibleContacts[0] || null,
    [visibleContacts, selectedId]
  );

  const kpis = useMemo(() => {
    const now = Date.now();
    const total = contacts.length;
    const active = contacts.filter((contact) => isRecentActivity(contact, now, 7)).length;
    const attention = contacts.filter((contact) => needsAttention(contact)).length;
    const quiet = contacts.filter((contact) => isQuietContact(contact, now)).length;
    const conversations = contacts.filter((contact) => Number(contact.conversationCount || 0) > 0).length;
    const fresh = contacts.filter((contact) => isNewContact(contact, now)).length;

    return { total, active, attention, quiet, conversations, fresh };
  }, [contacts]);

  const focusCopy = showingArchived
    ? "Base pausada para restaurar o depurar sin perder control del historial."
    : `${kpis.active} con movimiento reciente, ${kpis.attention} requieren atencion y ${kpis.quiet} estan frios.`;

  const allVisibleSelected = visibleContacts.length > 0 && visibleContacts.every((contact) => selectedIds.includes(contact.id));
  const selectedRead = selected ? getCommercialRead(selected) : null;

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
        setListFilter("all");
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

  async function deleteSelectedArchivedContacts() {
    if (readOnly || !showingArchived || selectedIds.length === 0 || deleting) return;

    const confirmed =
      typeof window === "undefined"
        ? false
        : window.confirm(`Se eliminaran definitivamente ${selectedIds.length} contactos archivados. Esta accion no se puede deshacer.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch("/api/app/contacts/archived", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedIds })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "contacts_delete_failed"));

      const deletedIds = Array.isArray(json?.deletedContactIds) ? json.deletedContactIds : selectedIds;
      const blockedCount = Number(json?.blockedCount || 0);
      const remaining = contacts.filter((contact) => !deletedIds.includes(contact.id));
      setContacts(remaining);
      setSelectedIds((current) => current.filter((id) => !deletedIds.includes(id)));
      if (selectedId && deletedIds.includes(selectedId)) {
        setSelectedId(remaining[0]?.id || "");
      }

      if (deletedIds.length > 0 && blockedCount === 0) {
        toast.success("Contactos eliminados", "Los archivados seleccionados se borraron definitivamente.");
      } else if (deletedIds.length > 0) {
        toast.success("Eliminacion parcial", `Se eliminaron ${deletedIds.length} contactos. ${blockedCount} no estaban disponibles para borrar.`);
      } else {
        toast.error("No se pudieron eliminar", "Los contactos archivados seleccionados ya no existen o no estaban disponibles para borrar.");
      }
    } catch (error) {
      toast.error("No se pudieron eliminar los contactos", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setDeleting(false);
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

  const countsByFilter = {
    all: contacts.length,
    recent: kpis.active,
    attention: kpis.attention,
    quiet: kpis.quiet,
    conversation: kpis.conversations
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label={showingArchived ? "Archivados visibles" : "Base CRM visible"}
          value={String(kpis.total)}
          helper={showingArchived ? "Registros pausados para restaurar o depurar." : "Contactos listos para seguimiento comercial."}
          foot={focusCopy}
          tone="orange"
          icon={<UserRound className="h-5 w-5" />}
          emphasis
        />
        <MetricCard
          label="Con movimiento"
          value={String(kpis.active)}
          helper="Actividad reciente en los ultimos 7 dias."
          foot={kpis.conversations > 0 ? `${kpis.conversations} con conversaciones visibles` : "Sin conversaciones visibles"}
          tone="green"
          icon={<MessageSquareMore className="h-5 w-5" />}
        />
        <MetricCard
          label="Requieren atencion"
          value={String(kpis.attention)}
          helper="Contactos con deuda o pagos libres por revisar."
          foot={kpis.attention > 0 ? "Conviene priorizarlos hoy" : "Sin alertas visibles"}
          tone="amber"
          icon={<WalletCards className="h-5 w-5" />}
        />
        <MetricCard
          label="Sin movimiento"
          value={String(kpis.quiet)}
          helper="Sin interaccion reciente o sin contexto actualizado."
          foot={kpis.quiet > 0 ? "Base fria para reactivar" : "Base activa sin rezagos"}
          tone="sky"
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Nuevos registros"
          value={String(kpis.fresh)}
          helper="Altas recientes con potencial de primer contacto."
          foot={showingArchived ? "Lectura sobre registros archivados" : "Entraron en los ultimos 7 dias"}
          tone="violet"
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.32fr)_380px]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader action={<Badge variant="muted">{visibleContacts.length} visibles</Badge>}>
            <div>
              <CardTitle className="text-xl">Centro CRM</CardTitle>
              <CardDescription>Lectura comercial rapida para revisar actividad, detectar frios y abrir el contacto correcto sin ruido.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant={showingArchived ? "ghost" : "secondary"} size="sm" className="rounded-2xl" onClick={() => setViewMode("active")}>
                    Activos
                  </Button>
                  <Button type="button" variant={showingArchived ? "secondary" : "ghost"} size="sm" className="rounded-2xl" onClick={() => setViewMode("archived")}>
                    Archivados
                  </Button>
                </div>
                <div className="relative flex-1 lg:max-w-[440px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar por nombre, telefono, email o empresa"
                    aria-label="Buscar contactos"
                    className="h-11 rounded-2xl border-white/8 bg-bg/70 pl-10"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setListFilter(filter.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        listFilter === filter.id
                          ? "border-brand/35 bg-brand/12 text-brandBright"
                          : "border-white/8 bg-bg/45 text-muted hover:border-white/12 hover:text-text"
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span className="text-xs">{countsByFilter[filter.id]}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-bg/55 px-3 py-2 text-sm">
                  <Filter className="h-4 w-4 text-muted" />
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="bg-transparent text-sm text-text outline-none"
                    aria-label="Ordenar contactos"
                  >
                    <option value="recent">Mas recientes</option>
                    <option value="activity">Mayor actividad</option>
                    <option value="attention">Requieren atencion</option>
                    <option value="name">Nombre A-Z</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/45 px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} contactos seleccionados para operar en bloque.`
                    : showingArchived
                      ? "Selecciona archivados para restaurar o depurar sin perder control del historial."
                      : "Selecciona visibles para ocultarlos del panel sin borrar el historial comercial."}
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
                    disabled={readOnly || selectedIds.length === 0 || archiving || restoring || deleting}
                  >
                    {showingArchived ? restoring ? "Restaurando..." : "Restaurar seleccionados" : archiving ? "Ocultando..." : "Ocultar seleccionados"}
                  </Button>
                  {showingArchived ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-2xl"
                      onClick={() => void deleteSelectedArchivedContacts()}
                      disabled={readOnly || selectedIds.length === 0 || restoring || deleting}
                    >
                      {deleting ? "Eliminando..." : "Eliminar seleccionados"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {!visibleContacts.length && !loadingContacts ? (
              <EmptyState
                icon={<UserRound className="h-5 w-5" />}
                title={
                  contacts.length > 0 && normalizedSearch
                    ? "No encontramos contactos para esa busqueda"
                    : showingArchived
                      ? "Todavia no hay contactos archivados"
                      : "Todavia no hay contactos visibles"
                }
                description={
                  contacts.length > 0 && normalizedSearch
                    ? "Prueba con otro nombre, telefono, email o empresa."
                    : showingArchived
                      ? "Cuando archives contactos desde la base activa, vas a poder restaurarlos desde aca."
                      : "Crea el primero para empezar a ordenar conversaciones, cobranzas y contexto comercial."
                }
              />
            ) : (
              <div className="space-y-3">
                {visibleContacts.map((contact) => {
                  const active = selected?.id === contact.id;
                  const commercialRead = getCommercialRead(contact);

                  return (
                    <div
                      key={contact.id}
                      className={`rounded-[24px] border px-4 py-4 transition-all ${
                        active
                          ? "border-brand/35 bg-[linear-gradient(180deg,rgba(192,80,0,0.12),rgba(255,255,255,0.02))] shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                          : "border-[color:var(--border)] bg-surface/55 hover:bg-surface/70"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <label className="mt-3 inline-flex items-center">
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

                          <button type="button" onClick={() => setSelectedId(contact.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                            <SimpleAvatar
                              src={contact.profileImageUrl}
                              name={contact.name}
                              className="h-14 w-14 rounded-[20px] border border-[color:var(--border)] bg-brand/10 text-brandBright"
                              fallbackClassName="bg-brand/10 text-brandBright"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-base font-semibold text-text">{contact.name}</p>
                                <Badge variant={contact.status === "archived" ? "danger" : "success"}>{contact.status || "active"}</Badge>
                                <OperationalBadge tone={commercialRead.tone}>{commercialRead.label}</OperationalBadge>
                              </div>
                              <p className="mt-1 truncate text-sm text-muted">
                                {contact.phone || contact.whatsappPhone || contact.email || "Sin datos de contacto"}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <MetaPill label="Canal" value={getChannelLabel(contact)} />
                                <MetaPill label="Empresa" value={contact.companyName || "Sin empresa"} />
                                <MetaPill label="Interacciones" value={String(contact.conversationCount || 0)} />
                              </div>
                            </div>
                          </button>
                        </div>

                        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <InfoMiniBlock
                            label="Ultimo movimiento"
                            value={relativeDateLabel(contact.lastInteractionAt || contact.updatedAt || contact.createdAt)}
                            helper={contact.lastInteractionAt ? "Ultima conversacion visible" : "Sin interaccion visible"}
                          />
                          <InfoMiniBlock
                            label="Lectura comercial"
                            value={commercialRead.shortValue}
                            helper={commercialRead.helper}
                          />
                          <InfoMiniBlock
                            label="Senal financiera"
                            value={getFinancialHeadline(contact)}
                            helper={getFinancialHelper(contact)}
                            tone={needsAttention(contact) ? "amber" : "green"}
                          />
                        </div>

                        <div className="flex items-center gap-2 self-end xl:self-center">
                          <Button type="button" variant={active ? "secondary" : "ghost"} size="sm" className="rounded-2xl" onClick={() => setSelectedId(contact.id)}>
                            Abrir
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="rounded-2xl">
                            <Link href={`/app/contacts/${contact.id}`}>Detalle</Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
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
                <CardTitle className="text-xl">Panel del contacto</CardTitle>
                <CardDescription>Resumen operativo para validar identidad, senales y proximos pasos sin salir de la base CRM.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {selected ? (
                <>
                  <div className="rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4">
                    <div className="flex items-start gap-4">
                      <SimpleAvatar
                        src={selected.profileImageUrl}
                        name={selected.name}
                        className="h-16 w-16 rounded-[22px] border border-[color:var(--border)] bg-brand/10 text-lg text-brandBright"
                        fallbackClassName="bg-brand/10 text-brandBright"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold">{selected.name}</p>
                        <p className="mt-1 text-sm text-muted">{selected.phone || selected.whatsappPhone || selected.email || "Sin dato principal de contacto"}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={selected.status === "archived" ? "danger" : "success"}>{selected.status || "active"}</Badge>
                          <OperationalBadge tone={selectedRead?.tone || "sky"}>{selectedRead?.label || "Sin lectura"}</OperationalBadge>
                          {selected.companyName ? <Badge variant="muted">{selected.companyName}</Badge> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailRow icon={<Clock3 className="h-4 w-4" />} label="Ultimo movimiento" value={relativeDateLabel(selected.lastInteractionAt || selected.updatedAt || selected.createdAt)} />
                    <DetailRow icon={<MessageSquareMore className="h-4 w-4" />} label="Conversaciones visibles" value={String(selected.conversationCount || 0)} />
                    <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={selected.email || "-"} />
                    <DetailRow icon={<Phone className="h-4 w-4" />} label="Telefono" value={selected.phone || selected.whatsappPhone || "-"} />
                    <DetailRow icon={<Building2 className="h-4 w-4" />} label="Empresa" value={selected.companyName || "-"} />
                    <DetailRow icon={<ReceiptText className="h-4 w-4" />} label="Documento fiscal" value={selected.taxId || "-"} />
                  </div>

                  <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Contexto comercial</p>
                    <div className="mt-3 space-y-3">
                      <InfoMiniBlock
                        label="Senal financiera"
                        value={getFinancialHeadline(selected)}
                        helper={getFinancialHelper(selected)}
                        tone={needsAttention(selected) ? "amber" : "green"}
                      />
                      <InfoMiniBlock
                        label="Canal principal"
                        value={getChannelLabel(selected)}
                        helper={selected.notes ? "Hay notas internas disponibles" : "Todavia sin notas internas"}
                      />
                    </div>
                    <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-bg/45 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">Observaciones</p>
                      <p className="mt-2 text-sm leading-6 text-muted">{selected.notes || "Sin notas cargadas para este contacto."}</p>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<UserRound className="h-5 w-5" />}
                  title="Selecciona un contacto"
                  description="Desde aqui puedes revisar rapidamente el contexto operativo del registro activo."
                  className="min-h-[220px]"
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
            <CardHeader action={!readOnly ? <Badge variant="warning">Nuevo</Badge> : <Badge variant="muted">Solo lectura</Badge>}>
              <div>
                <CardTitle className="text-xl">Crear contacto</CardTitle>
                <CardDescription>Alta minima para sumar un registro al CRM sin salir del espacio de trabajo.</CardDescription>
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
                      <Button type="button" variant="ghost" size="sm" className="rounded-2xl" onClick={() => setDraft((current) => ({ ...current, profileImageUrl: "" }))} disabled={readOnly || saving}>
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
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  foot,
  tone,
  icon,
  emphasis = false
}: {
  label: string;
  value: string;
  helper: string;
  foot: string;
  tone: SurfaceTone;
  icon: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <Card className={`${emphasis ? toneSurfaceClass(tone) : "border-white/6 bg-card/90"} shadow-[var(--card-shadow)]`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex h-12 w-12 items-center justify-center rounded-[20px] border ${toneIconClass(tone)}`}>{icon}</span>
          <div className="min-w-0 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">{helper}</p>
        <p className={`mt-2 text-xs font-medium ${toneValueClass(tone)}`}>{foot}</p>
      </CardContent>
    </Card>
  );
}

function OperationalBadge({ tone, children }: { tone: SurfaceTone; children: ReactNode }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${toneBadgeClass(tone)}`}>{children}</span>;
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-bg/45 px-2.5 py-1 text-xs text-muted">
      <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>
      <span className="text-text">{value}</span>
    </span>
  );
}

function InfoMiniBlock({
  label,
  value,
  helper,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  tone?: SurfaceTone;
}) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-bg/45 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${tone ? toneValueClass(tone) : "text-text"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
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

function matchesListFilter(contact: PortalContactDetail, filter: ListFilter) {
  if (filter === "all") return true;
  if (filter === "recent") return isRecentActivity(contact, Date.now(), 7);
  if (filter === "attention") return needsAttention(contact);
  if (filter === "quiet") return isQuietContact(contact, Date.now());
  return Number(contact.conversationCount || 0) > 0;
}

function compareContacts(left: PortalContactDetail, right: PortalContactDetail, sortMode: SortMode) {
  if (sortMode === "name") return (left.name || "").localeCompare(right.name || "", "es");
  if (sortMode === "activity") return Number(right.conversationCount || 0) - Number(left.conversationCount || 0);
  if (sortMode === "attention") return Number(needsAttention(right)) - Number(needsAttention(left)) || byMostRecent(left, right);
  return byMostRecent(left, right);
}

function byMostRecent(left: PortalContactDetail, right: PortalContactDetail) {
  return getContactTimestamp(right) - getContactTimestamp(left);
}

function getContactTimestamp(contact: PortalContactDetail) {
  const raw = contact.lastInteractionAt || contact.updatedAt || contact.createdAt;
  const parsed = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecentActivity(contact: PortalContactDetail, now: number, days: number) {
  const ts = getContactTimestamp(contact);
  if (!ts) return false;
  return now - ts <= days * 24 * 60 * 60 * 1000;
}

function isQuietContact(contact: PortalContactDetail, now: number) {
  const ts = getContactTimestamp(contact);
  if (!ts) return true;
  return now - ts > 14 * 24 * 60 * 60 * 1000;
}

function isNewContact(contact: PortalContactDetail, now: number) {
  const created = contact.createdAt ? new Date(contact.createdAt).getTime() : 0;
  if (!created) return false;
  return now - created <= 7 * 24 * 60 * 60 * 1000;
}

function needsAttention(contact: PortalContactDetail) {
  const signal = contact.financialSignal;
  return Number(signal?.outstandingAmount || 0) > 0 || Number(signal?.unallocatedPayments || 0) > 0;
}

function getFinancialHeadline(contact: PortalContactDetail) {
  const outstanding = Number(contact.financialSignal?.outstandingAmount || 0);
  const unallocated = Number(contact.financialSignal?.unallocatedPayments || 0);
  if (outstanding > 0) return "Con deuda";
  if (unallocated > 0) return "Pago libre";
  return "Al dia";
}

function getFinancialHelper(contact: PortalContactDetail) {
  const outstanding = Number(contact.financialSignal?.outstandingAmount || 0);
  const unallocated = Number(contact.financialSignal?.unallocatedPayments || 0);
  if (outstanding > 0) return `Pendiente ${formatMoney(outstanding)}`;
  if (unallocated > 0) return `${formatMoney(unallocated)} sin asignar`;
  return "Sin pendiente visible";
}

function getChannelLabel(contact: PortalContactDetail) {
  if (contact.whatsappPhone || contact.waId) return "WhatsApp";
  if (contact.email) return "Email";
  return "Telefonico";
}

function getCommercialRead(contact: PortalContactDetail): { label: string; shortValue: string; helper: string; tone: SurfaceTone } {
  const now = Date.now();
  if (contact.status === "archived") {
    return { label: "Archivado", shortValue: "Base pausada", helper: "Registro fuera de la base activa.", tone: "violet" };
  }

  if (needsAttention(contact)) {
    return { label: "Atencion hoy", shortValue: "Prioridad comercial", helper: getFinancialHelper(contact), tone: "amber" };
  }

  if (isRecentActivity(contact, now, 7) && Number(contact.conversationCount || 0) > 0) {
    return {
      label: "En seguimiento",
      shortValue: `${contact.conversationCount || 0} interacciones`,
      helper: "Actividad visible reciente en el canal.",
      tone: "green"
    };
  }

  if (isQuietContact(contact, now)) {
    return { label: "Sin movimiento", shortValue: "Base fria", helper: "Conviene reactivar este registro.", tone: "sky" };
  }

  if (isNewContact(contact, now)) {
    return { label: "Nuevo registro", shortValue: "Recien ingresado", helper: "Todavia necesita primer contexto comercial.", tone: "violet" };
  }

  return { label: "Base activa", shortValue: "Seguimiento abierto", helper: "Registro visible para operar.", tone: "orange" };
}

function toneIconClass(tone: SurfaceTone) {
  if (tone === "orange") return "border-brand/25 bg-brand/10 text-brandBright";
  if (tone === "amber") return "border-[#f2a44c]/20 bg-[#f2a44c]/10 text-[#f2a44c]";
  if (tone === "green") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (tone === "violet") return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  return "border-sky-500/20 bg-sky-500/10 text-sky-300";
}

function toneSurfaceClass(tone: SurfaceTone) {
  if (tone === "orange") return "border-brand/18 bg-[linear-gradient(180deg,rgba(192,80,0,0.12),rgba(255,255,255,0.02))]";
  if (tone === "amber") return "border-[#f2a44c]/18 bg-[linear-gradient(180deg,rgba(242,164,76,0.12),rgba(255,255,255,0.02))]";
  if (tone === "green") return "border-emerald-500/18 bg-[linear-gradient(180deg,rgba(34,120,84,0.12),rgba(255,255,255,0.02))]";
  if (tone === "violet") return "border-violet-500/18 bg-[linear-gradient(180deg,rgba(109,76,205,0.12),rgba(255,255,255,0.02))]";
  return "border-sky-500/18 bg-[linear-gradient(180deg,rgba(51,166,255,0.12),rgba(255,255,255,0.02))]";
}

function toneValueClass(tone: SurfaceTone) {
  if (tone === "orange") return "text-brandBright";
  if (tone === "amber") return "text-[#f2a44c]";
  if (tone === "green") return "text-emerald-300";
  if (tone === "violet") return "text-violet-300";
  return "text-sky-300";
}

function toneBadgeClass(tone: SurfaceTone) {
  if (tone === "orange") return "border-brand/25 bg-brand/12 text-brandBright";
  if (tone === "amber") return "border-[#f2a44c]/20 bg-[#f2a44c]/10 text-[#f2a44c]";
  if (tone === "green") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (tone === "violet") return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  return "border-sky-500/20 bg-sky-500/10 text-sky-300";
}
