"use client";

import { useEffect, useMemo, useState } from "react";
import type { PortalAgendaAvailabilityDay, PortalContact } from "@/lib/api";
import {
  Ban,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  NotebookPen,
  PencilLine,
  Plus,
  Trash2,
  UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/ui/cn";

type AgendaItemType = "note" | "follow_up" | "task" | "appointment" | "blocked" | "availability";
type AgendaStatus = "pending" | "done" | "cancelled";

type AgendaItem = {
  id: string;
  clinicId: string;
  date: string;
  startAt: string | null;
  endAt: string | null;
  contactId: string | null;
  contact: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  startTime: string | null;
  endTime: string | null;
  type: AgendaItemType;
  title: string;
  description: string | null;
  status: AgendaStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

type DraftState = {
  title: string;
  type: AgendaItemType;
  description: string;
  startTime: string;
  endTime: string;
  contactId: string;
};

type EditState = DraftState & {
  date: string;
  status: AgendaStatus;
};

const monthLabels = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

const weekLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthRange(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    from: toDateKey(from),
    to: toDateKey(to)
  };
}

function typeMeta(type: AgendaItemType) {
  if (type === "appointment") return { label: "Turno", variant: "success" as const };
  if (type === "blocked") return { label: "No disponible", variant: "danger" as const };
  if (type === "availability") return { label: "Disponible", variant: "outline" as const };
  if (type === "follow_up") return { label: "Seguimiento", variant: "warning" as const };
  if (type === "task") return { label: "Tarea", variant: "outline" as const };
  return { label: "Nota", variant: "muted" as const };
}

function statusMeta(status: AgendaStatus) {
  if (status === "done") return { label: "Hecho", variant: "success" as const };
  if (status === "cancelled") return { label: "Cancelado", variant: "danger" as const };
  return { label: "Pendiente", variant: "warning" as const };
}

function formatTimeLabel(item: AgendaItem) {
  if (item.startTime && item.endTime) return `${item.startTime} - ${item.endTime}`;
  if (item.startTime) return item.startTime;
  return "Sin hora";
}

function requiresTimeRange(type: AgendaItemType) {
  return type === "appointment" || type === "blocked" || type === "availability";
}

function getItemSurface(type: AgendaItemType) {
  if (type === "blocked") return "border-rose-500/30 bg-rose-500/10";
  if (type === "availability") return "border-emerald-500/25 bg-emerald-500/10";
  if (type === "appointment") return "border-emerald-400/25 bg-emerald-500/8";
  return "border-[color:var(--border)] bg-surface/65";
}

function toEditState(item: AgendaItem): EditState {
  return {
    date: item.date,
    title: item.title,
    type: item.type,
    description: item.description || "",
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    contactId: item.contactId || "",
    status: item.status
  };
}

export function AgendaWorkspace() {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(today));
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [mutationBusyId, setMutationBusyId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [contacts, setContacts] = useState<PortalContact[]>([]);
  const [availabilityDay, setAvailabilityDay] = useState<PortalAgendaAvailabilityDay | null>(null);
  const [draft, setDraft] = useState<DraftState>({
    title: "",
    type: "note",
    description: "",
    startTime: "",
    endTime: "",
    contactId: ""
  });
  const [editDraft, setEditDraft] = useState<EditState | null>(null);

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const calendarStart = new Date(monthStart);
  const startDay = (monthStart.getDay() + 6) % 7;
  calendarStart.setDate(monthStart.getDate() - startDay);

  useEffect(() => {
    const controller = new AbortController();
    const range = monthRange(currentMonth);

    async function loadMonth() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/app/agenda?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const json = (await response.json().catch(() => null)) as
          | { data?: { items?: AgendaItem[] }; detail?: string; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(json?.detail || json?.error || "No pudimos cargar la agenda.");
        }

        setItems(Array.isArray(json?.data?.items) ? json.data.items : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "No pudimos cargar la agenda.";
        setErrorMessage(message);
        setItems([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMonth();
    return () => controller.abort();
  }, [currentMonth]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadContacts() {
      setContactsLoading(true);

      try {
        const response = await fetch("/api/app/contacts", {
          cache: "no-store",
          signal: controller.signal
        });
        const json = (await response.json().catch(() => null)) as
          | { contacts?: PortalContact[]; detail?: string; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(json?.detail || json?.error || "No pudimos cargar los contactos.");
        }

        setContacts(Array.isArray(json?.contacts) ? json.contacts : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        toast.error("No pudimos cargar los contactos", error instanceof Error ? error.message : "unknown_error");
        setContacts([]);
      } finally {
        if (!controller.signal.aborted) {
          setContactsLoading(false);
        }
      }
    }

    void loadContacts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAvailabilityDay() {
      setAvailabilityLoading(true);

      try {
        const response = await fetch(`/api/app/agenda/availability?date=${encodeURIComponent(selectedDateKey)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const json = (await response.json().catch(() => null)) as
          | { data?: { days?: PortalAgendaAvailabilityDay[] }; detail?: string; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(json?.detail || json?.error || "No pudimos consultar la disponibilidad.");
        }

        setAvailabilityDay(Array.isArray(json?.data?.days) ? json.data.days[0] || null : null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setAvailabilityDay(null);
        toast.error("No pudimos consultar la disponibilidad", error instanceof Error ? error.message : "unknown_error");
      } finally {
        if (!controller.signal.aborted) {
          setAvailabilityLoading(false);
        }
      }
    }

    void loadAvailabilityDay();
    return () => controller.abort();
  }, [selectedDateKey, refreshSeed]);

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    const dateKey = toDateKey(date);
    return {
      date,
      dateKey,
      inCurrentMonth: date.getMonth() === currentMonth.getMonth(),
      isToday: dateKey === toDateKey(today),
      isSelected: dateKey === selectedDateKey,
      count: items.filter((item) => item.date === dateKey && item.status !== "cancelled").length
    };
  });

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);

  const selectedItems = items
    .filter((item) => item.date === selectedDateKey)
    .sort((a, b) => `${a.startTime || "99:99"}${a.createdAt || ""}`.localeCompare(`${b.startTime || "99:99"}${b.createdAt || ""}`));

  const monthItems = items.filter((item) => item.date >= toDateKey(monthStart) && item.date <= toDateKey(monthEnd));
  const appointmentCount = monthItems.filter((item) => item.type === "appointment" && item.status !== "cancelled").length;
  const blockedCount = monthItems.filter((item) => item.type === "blocked" && item.status !== "cancelled").length;
  const availabilityCount = monthItems.filter((item) => item.type === "availability" && item.status !== "cancelled").length;
  const pendingCount = monthItems.filter((item) => item.status === "pending").length;
  const selectedAvailability = selectedItems.filter((item) => item.type === "availability" && item.status !== "cancelled");
  const selectedBlocked = selectedItems.filter((item) => item.type === "blocked" && item.status !== "cancelled");
  const selectedAppointments = selectedItems.filter((item) => item.type === "appointment" && item.status !== "cancelled");
  const createDisabled = createBusy || !draft.title.trim() || (requiresTimeRange(draft.type) && (!draft.startTime || !draft.endTime));
  const editDisabled =
    editBusy ||
    !editDraft?.title.trim() ||
    (editDraft ? requiresTimeRange(editDraft.type) && (!editDraft.startTime || !editDraft.endTime) : false);

  function shiftMonth(direction: -1 | 1) {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);
    setCurrentMonth(nextMonth);
    setSelectedDateKey(toDateKey(nextMonth));
  }

  async function handleCreateItem() {
    if (!draft.title.trim()) return;

    setCreateBusy(true);
    try {
      const endpoint = draft.type === "appointment" ? "/api/app/agenda/reservations" : "/api/app/agenda";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: selectedDateKey,
          startTime: draft.startTime || null,
          endTime: draft.endTime || null,
          contactId: draft.contactId || null,
          type: draft.type,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          status: "pending"
        })
      });
      const json = (await response.json().catch(() => null)) as { data?: AgendaItem; detail?: string; error?: string } | null;

      if (!response.ok || !json?.data) {
        throw new Error(json?.detail || json?.error || "No pudimos guardar el item.");
      }

      const nextItem = json.data;
      setItems((current) => [...current, nextItem]);
      setDraft({
        title: "",
        type: "note",
        description: "",
        startTime: "",
        endTime: "",
        contactId: ""
      });
      setRefreshSeed((current) => current + 1);
      toast.success(
        draft.type === "appointment" ? "Turno reservado" : "Item creado",
        draft.contactId ? "La agenda guardo el item y su contacto asociado." : "La agenda ya guardo el item en este tenant."
      );
    } catch (error) {
      toast.error("No pudimos crear el item", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleStatusChange(item: AgendaItem, status: AgendaStatus) {
    setMutationBusyId(item.id);
    try {
      const response = await fetch(`/api/app/agenda/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      const json = (await response.json().catch(() => null)) as { data?: AgendaItem; detail?: string; error?: string } | null;

      if (!response.ok || !json?.data) {
        throw new Error(json?.detail || json?.error || "No pudimos actualizar el item.");
      }

      const nextItem = json.data;
      setItems((current) => current.map((entry) => (entry.id === item.id ? nextItem : entry)));
      setRefreshSeed((current) => current + 1);
    } catch (error) {
      toast.error("No pudimos actualizar el item", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setMutationBusyId(null);
    }
  }

  function startEditing(item: AgendaItem) {
    setEditingItemId(item.id);
    setEditDraft(toEditState(item));
  }

  function stopEditing() {
    setEditingItemId(null);
    setEditDraft(null);
  }

  async function handleSaveEdit() {
    if (!editingItemId || !editDraft || !editDraft.title.trim()) return;

    setEditBusy(true);
    try {
      const response = await fetch(`/api/app/agenda/${editingItemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: editDraft.date,
          type: editDraft.type,
          title: editDraft.title.trim(),
          description: editDraft.description.trim() || null,
          contactId: editDraft.type === "blocked" || editDraft.type === "availability" ? null : editDraft.contactId || null,
          startTime: editDraft.startTime || null,
          endTime: editDraft.endTime || null,
          status: editDraft.status
        })
      });
      const json = (await response.json().catch(() => null)) as { data?: AgendaItem; detail?: string; error?: string } | null;

      if (!response.ok || !json?.data) {
        throw new Error(json?.detail || json?.error || "No pudimos guardar los cambios.");
      }

      const nextItem = json.data;
      setItems((current) => current.map((entry) => (entry.id === editingItemId ? nextItem : entry)));
      const nextDate = parseDateKey(nextItem.date);
      setCurrentMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      setSelectedDateKey(nextItem.date);
      setRefreshSeed((current) => current + 1);
      stopEditing();
      toast.success("Item actualizado", "La agenda guardo los cambios del item seleccionado.");
    } catch (error) {
      toast.error("No pudimos guardar los cambios", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDelete(item: AgendaItem) {
    setMutationBusyId(item.id);
    try {
      const response = await fetch(`/api/app/agenda/${item.id}`, {
        method: "DELETE"
      });
      const json = (await response.json().catch(() => null)) as { detail?: string; error?: string } | null;

      if (!response.ok) {
        throw new Error(json?.detail || json?.error || "No pudimos borrar el item.");
      }

      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setRefreshSeed((current) => current + 1);
    } catch (error) {
      toast.error("No pudimos borrar el item", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setMutationBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="success">Persistente</Badge>}>
            <div>
              <CardTitle className="text-lg">Agenda operativa</CardTitle>
              <CardDescription>Los items se guardan por tenant y ahora cubren disponibilidad, bloqueos y turnos simples.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-sm leading-6 text-muted">
            Esta fase ya soporta notas, seguimientos, tareas, turnos, franjas no disponibles y disponibilidad base con persistencia tenant-scoped.
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">{appointmentCount} turnos</Badge>}>
            <div>
              <CardTitle className="text-lg">Franjas del mes</CardTitle>
              <CardDescription>Lectura operativa de turnos y bloques guardados en este tenant.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-sm leading-6 text-muted">
            {availabilityCount} bloques disponibles, {blockedCount} bloqueos y {pendingCount} items pendientes para la operacion diaria.
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="outline">Fase 3</Badge>}>
            <div>
              <CardTitle className="text-lg">Base de producto</CardTitle>
              <CardDescription>Disponibilidad y turnos simples hoy, sin abrir todavia bot ni scheduling avanzado.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0 text-sm text-muted">
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-3 py-2">Items por tenant/clinic</div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-3 py-2">Turnos, disponibilidad y bloqueos en el mismo modelo</div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-3 py-2">Validacion basica de horarios y choques obvios</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            <div>
              <CardTitle className="text-xl">
                {monthLabels[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </CardTitle>
              <CardDescription>La agenda trae los items reales del mes visible y los organiza por dia.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-muted">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Cargando agenda del mes...
              </div>
            ) : errorMessage ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMessage}</div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekLabels.map((label) => (
                  <div key={label} className="px-2 pb-1 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
                    {label}
                  </div>
                ))}

                {calendarDays.map((day) => (
                  <button
                    key={day.dateKey}
                    type="button"
                    onClick={() => setSelectedDateKey(day.dateKey)}
                    className={cn(
                      "min-h-[108px] rounded-2xl border p-3 text-left transition",
                      day.isSelected
                        ? "border-brand/40 bg-brand/10 shadow-[0_0_0_1px_rgba(192,80,0,0.12)]"
                        : "border-[color:var(--border)] bg-surface/65 hover:bg-surface",
                      !day.inCurrentMonth && "opacity-45"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-sm font-medium", day.isToday && "text-brandBright")}>{day.date.getDate()}</span>
                      {day.isToday ? <Badge variant="warning">Hoy</Badge> : null}
                    </div>
                    <div className="mt-4 space-y-2">
                      {day.count > 0 ? (
                        <>
                          <div className="h-2 rounded-full bg-brand/40" />
                          <p className="text-xs text-muted">{day.count} item(s)</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted">Libre</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="muted">{selectedItems.length} item(s)</Badge>}>
              <div>
                <CardTitle className="text-xl">
                  {selectedDate.toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long"
                  })}
                </CardTitle>
                <CardDescription>Panel diario conectado a los items reales del tenant.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <div className="flex items-center gap-2">
                    <CalendarCheck2 className="h-4 w-4" />
                    <span className="font-medium">Disponible</span>
                  </div>
                  <p className="mt-2 text-xs text-emerald-100/80">
                    {selectedAvailability.length ? selectedAvailability.map((item) => formatTimeLabel(item)).join(", ") : "Sin bloques base para este dia"}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    <span className="font-medium">No disponible</span>
                  </div>
                  <p className="mt-2 text-xs text-rose-100/80">
                    {selectedBlocked.length ? selectedBlocked.map((item) => formatTimeLabel(item)).join(", ") : "Sin bloqueos cargados"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-surface/65 p-3 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-brandBright" />
                    <span className="font-medium text-text">Turnos</span>
                  </div>
                  <p className="mt-2 text-xs">
                    {selectedAppointments.length ? `${selectedAppointments.length} reservado(s)` : "Todavia no hay turnos para este dia"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-bg/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Consulta preparada para bot</p>
                    <p className="mt-1 text-xs text-muted">
                      {availabilityDay
                        ? availabilityDay.policy === "explicit_availability"
                          ? "El dia usa disponibilidad explicita y devuelve ventanas reservables."
                          : "El dia no define availability explicita; se exponen ocupados y bloqueos para decision futura."
                        : "Estamos consultando la capa de disponibilidad del dia."}
                    </p>
                  </div>
                  <Badge variant="outline">{availabilityLoading ? "Consultando" : "Backend listo"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                  {availabilityDay?.bookableWindows?.length ? (
                    availabilityDay.bookableWindows.map((window) => (
                      <span key={`${window.date}-${window.startTime}-${window.endTime}`} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                        {window.startTime} - {window.endTime}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-[color:var(--border)] bg-surface/65 px-3 py-1">
                      {availabilityLoading ? "Consultando ventanas..." : "Sin ventanas reservables calculadas para este dia"}
                    </span>
                  )}
                </div>
              </div>

              {selectedItems.length ? (
                selectedItems.map((item) => {
                  const meta = typeMeta(item.type);
                  const status = statusMeta(item.status);
                  const isBusy = mutationBusyId === item.id;

                  return (
                    <div key={item.id} className={cn("rounded-2xl border p-4", getItemSurface(item.type))}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <Badge variant="outline">{formatTimeLabel(item)}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => startEditing(item)} disabled={isBusy}>
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => void handleDelete(item)} disabled={isBusy}>
                            {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {item.description ? <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p> : null}
                      {item.contact ? (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-bg/50 px-3 py-2 text-sm text-muted">
                          <UserRound className="h-4 w-4 text-brandBright" />
                          <span>{item.contact.name}</span>
                          {item.contact.phone ? <span>- {item.contact.phone}</span> : null}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "pending")} disabled={isBusy || item.status === "pending"}>
                          Pendiente
                        </Button>
                        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "done")} disabled={isBusy || item.status === "done"}>
                          Hecho
                        </Button>
                        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "cancelled")} disabled={isBusy || item.status === "cancelled"}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-bg/35 p-4 text-sm leading-6 text-muted">
                  Todavia no hay items para este dia. Puedes guardar una nota, un seguimiento, una tarea, una franja disponible o un bloqueo simple.
                </div>
              )}

              {editingItemId && editDraft ? (
                <div className="rounded-3xl border border-brand/25 bg-brand/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Editar item</p>
                      <p className="mt-1 text-xs text-muted">Puedes cambiar tipo, fecha, horario, contacto, nota y estado sin salir del panel del dia.</p>
                    </div>
                    <Badge variant="outline">Edicion activa</Badge>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Fecha</span>
                      <Input type="date" value={editDraft.date} onChange={(event) => setEditDraft((current) => (current ? { ...current, date: event.target.value } : current))} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Estado</span>
                      <select
                        value={editDraft.status}
                        onChange={(event) => setEditDraft((current) => (current ? { ...current, status: event.target.value as AgendaStatus } : current))}
                        className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="done">Hecho</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2 text-sm">
                    <span className="font-medium">Titulo</span>
                    <Input value={editDraft.title} onChange={(event) => setEditDraft((current) => (current ? { ...current, title: event.target.value } : current))} />
                  </label>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Tipo</span>
                      <select
                        value={editDraft.type}
                        onChange={(event) =>
                          setEditDraft((current) => {
                            if (!current) return current;
                            const nextType = event.target.value as AgendaItemType;
                            return {
                              ...current,
                              type: nextType,
                              contactId: nextType === "blocked" || nextType === "availability" ? "" : current.contactId
                            };
                          })
                        }
                        className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <option value="note">Nota interna</option>
                        <option value="follow_up">Seguimiento</option>
                        <option value="task">Tarea</option>
                        <option value="appointment">Turno</option>
                        <option value="blocked">Bloque no disponible</option>
                        <option value="availability">Disponibilidad</option>
                      </select>
                    </label>

                    {editDraft.type === "blocked" || editDraft.type === "availability" ? (
                      <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">
                        Este tipo no usa contacto asociado y sigue validando franjas horarias.
                      </div>
                    ) : (
                      <label className="space-y-2 text-sm">
                        <span className="font-medium">Contacto asociado</span>
                        <select
                          value={editDraft.contactId}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, contactId: event.target.value } : current))}
                          className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          disabled={contactsLoading}
                        >
                          <option value="">{contactsLoading ? "Cargando contactos..." : "Sin asociar"}</option>
                          {contacts.map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {contact.name}{contact.phone ? ` - ${contact.phone}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Inicio</span>
                      <Input value={editDraft.startTime} onChange={(event) => setEditDraft((current) => (current ? { ...current, startTime: event.target.value } : current))} placeholder={requiresTimeRange(editDraft.type) ? "09:30" : "Opcional"} />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Fin</span>
                      <Input value={editDraft.endTime} onChange={(event) => setEditDraft((current) => (current ? { ...current, endTime: event.target.value } : current))} placeholder={requiresTimeRange(editDraft.type) ? "10:00" : "Opcional"} />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2 text-sm">
                    <span className="font-medium">Nota</span>
                    <Textarea value={editDraft.description} onChange={(event) => setEditDraft((current) => (current ? { ...current, description: event.target.value } : current))} className="min-h-28" />
                  </label>

                  <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">
                    {editDraft.type === "appointment"
                      ? "Los turnos editados siguen respetando conflictos obvios y la disponibilidad explicita si existe."
                      : requiresTimeRange(editDraft.type)
                        ? "Este tipo mantiene horario obligatorio y reutiliza la validacion actual de Agenda."
                        : "Este tipo no exige horario, pero puedes dejar una franja si te sirve para operacion interna."}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button className="rounded-2xl" onClick={() => void handleSaveEdit()} disabled={editDisabled}>
                      {editBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <PencilLine className="mr-2 h-4 w-4" />}
                      Guardar cambios
                    </Button>
                    <Button variant="secondary" className="rounded-2xl" onClick={stopEditing} disabled={editBusy}>
                      Cancelar edicion
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="warning">CRUD basico</Badge>}>
              <div>
                <CardTitle className="text-xl">Crear item del dia</CardTitle>
                <CardDescription>La experiencia visual se mantiene y ahora puedes marcar disponibilidad, turnos o bloqueos.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Titulo</span>
                <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Llamar al cliente despues de la propuesta" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Tipo</span>
                  <select
                    value={draft.type}
                    onChange={(event) =>
                      setDraft((current) => {
                        const nextType = event.target.value as AgendaItemType;
                        return {
                          ...current,
                          type: nextType,
                          contactId: nextType === "blocked" || nextType === "availability" ? "" : current.contactId
                        };
                      })
                    }
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="note">Nota interna</option>
                    <option value="follow_up">Seguimiento</option>
                    <option value="task">Tarea</option>
                    <option value="appointment">Turno</option>
                    <option value="blocked">Bloque no disponible</option>
                    <option value="availability">Disponibilidad</option>
                  </select>
                </label>

                {draft.type === "blocked" || draft.type === "availability" ? (
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">
                    Este bloque afecta la disponibilidad general del dia y no necesita contacto asociado.
                  </div>
                ) : (
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Contacto asociado</span>
                    <select
                      value={draft.contactId}
                      onChange={(event) => setDraft((current) => ({ ...current, contactId: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      disabled={contactsLoading}
                    >
                      <option value="">{contactsLoading ? "Cargando contactos..." : "Sin asociar"}</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name}{contact.phone ? ` - ${contact.phone}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Inicio</span>
                  <Input value={draft.startTime} onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))} placeholder={requiresTimeRange(draft.type) ? "09:30" : "Opcional"} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Fin</span>
                  <Input value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} placeholder={requiresTimeRange(draft.type) ? "10:00" : "Opcional"} />
                </label>
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-3 text-sm text-muted">
                {draft.type === "availability"
                  ? "Usa este bloque para marcar franjas base disponibles que luego podra leer el bot."
                  : draft.type === "blocked"
                    ? "Usa este bloque para reservar una franja como no disponible y evitar choques obvios con turnos."
                    : draft.contactId
                  ? `Este item quedara vinculado a ${contacts.find((contact) => contact.id === draft.contactId)?.name || "un contacto real"} dentro del tenant.`
                  : requiresTimeRange(draft.type)
                    ? "Este tipo requiere hora de inicio y fin para guardar una franja valida."
                    : "La asociacion a contacto es opcional. Puedes crear notas, seguimientos o tareas sin vincular a nadie todavia."}
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Nota</span>
                <Textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Contexto, pendiente o instruccion interna para este item."
                  className="min-h-28"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <Button className="rounded-2xl" onClick={() => void handleCreateItem()} disabled={createDisabled}>
                  {createBusy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Crear item
                </Button>
                <div className="inline-flex items-center rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-2 text-sm text-muted">
                  {requiresTimeRange(draft.type)
                    ? "Para este tipo debes definir una franja completa de inicio y fin."
                    : "Estado inicial pendiente. Luego puedes marcarlo como hecho o cancelado."}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="outline">Preparado</Badge>}>
              <div>
                <CardTitle className="text-xl">Direccion de producto</CardTitle>
                <CardDescription>Lo que esta fase deja listo para crecer sin mezclar todavia bot, Google Calendar ni scheduling avanzado.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              {[
                { icon: NotebookPen, title: "Notas y contexto", detail: "Cada dia puede concentrar comentarios internos y proximos pasos." },
                { icon: UserRound, title: "Contacto asociado", detail: "Cada item ya puede quedar vinculado a un cliente real del workspace sin forzarlo." },
                { icon: Clock3, title: "Turnos y bloqueos", detail: "Ya puedes guardar franjas con horario y evitar inconsistencias obvias entre bloqueos y turnos." },
                { icon: CalendarDays, title: "Futura integracion con bot", detail: "Mas adelante podra leer disponibilidad base, detectar bloques y reservar sobre esta misma estructura." }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        <Icon className="h-4 w-4 text-brandBright" />
                      </span>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
