"use client";

import Link from "next/link";
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
type AgendaStatus = "pending" | "confirmed" | "done" | "reschedule" | "cancelled";

type AgendaItem = {
  id: string;
  clinicId: string;
  date: string;
  startAt: string | null;
  endAt: string | null;
  contactId: string | null;
  conversationId?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
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
  commercialActionType?: "visit" | "demo" | "follow_up" | null;
  commercialOutcome?: "interested" | "not_interested" | "proposal_requested" | "follow_up_later" | "future_demo" | "won" | null;
  origin?: string | null;
  location?: string | null;
  resultNote?: string | null;
  nextStepNote?: string | null;
  nextActionAt?: string | null;
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
  conversationId: string;
  assignedUserId: string;
  commercialActionType: "visit" | "demo" | "follow_up" | "";
  commercialOutcome: "interested" | "not_interested" | "proposal_requested" | "follow_up_later" | "future_demo" | "won" | "";
  origin: string;
  location: string;
  resultNote: string;
  nextStepNote: string;
  nextActionAt: string;
  contactNameSnapshot: string;
  phoneSnapshot: string;
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
    conversationId: item.conversationId || "",
    assignedUserId: item.assignedUserId || "",
    commercialActionType: item.commercialActionType || "",
    commercialOutcome: item.commercialOutcome || "",
    origin: item.origin || "",
    location: item.location || "",
    resultNote: item.resultNote || "",
    nextStepNote: item.nextStepNote || "",
    nextActionAt: item.nextActionAt ? item.nextActionAt.slice(0, 16) : "",
    contactNameSnapshot: item.contact?.name || "",
    phoneSnapshot: item.contact?.phone || "",
    status: item.status
  };
}

type AgendaWorkspaceProps = {
  currentUserId?: string | null;
  sellerOptions?: Array<{ id: string; name: string; role: string }>;
  initialCommercialPrefill?: {
    conversationId?: string;
    contactId?: string;
    contactName?: string;
    phone?: string;
    actionType?: "visit" | "demo" | "follow_up";
  };
};

function buildCommercialTitle(actionType?: "visit" | "demo" | "follow_up", contactName?: string | null) {
  const base =
    actionType === "visit"
      ? "Visita comercial"
      : actionType === "demo"
        ? "Demo comercial"
        : "Seguimiento comercial";
  return contactName ? `${base} - ${contactName}` : base;
}

function createDraftState(initialCommercialPrefill?: AgendaWorkspaceProps["initialCommercialPrefill"]): DraftState {
  return {
    title: initialCommercialPrefill?.actionType
      ? buildCommercialTitle(initialCommercialPrefill.actionType, initialCommercialPrefill.contactName)
      : "",
    type: initialCommercialPrefill?.actionType ? "appointment" : "note",
    description: initialCommercialPrefill?.conversationId ? "Lead comercial derivado desde bot handoff." : "",
    startTime: "",
    endTime: "",
    contactId: initialCommercialPrefill?.contactId || "",
    conversationId: initialCommercialPrefill?.conversationId || "",
    assignedUserId: "",
    commercialActionType: initialCommercialPrefill?.actionType || "",
    commercialOutcome: "",
    origin: initialCommercialPrefill?.conversationId ? "lead_comercial_bot_handoff" : "",
    location: "",
    resultNote: "",
    nextStepNote: "",
    nextActionAt: "",
    contactNameSnapshot: initialCommercialPrefill?.contactName || "",
    phoneSnapshot: initialCommercialPrefill?.phone || ""
  };
}

function toConversationNextActionAt(date: string, startTime?: string | null) {
  if (!date || !startTime) return null;
  const iso = new Date(`${date}T${startTime}:00`).toISOString();
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function commercialActionLabel(actionType?: "visit" | "demo" | "follow_up" | null) {
  if (actionType === "visit") return "Visita comercial";
  if (actionType === "demo") return "Demo comercial";
  if (actionType === "follow_up") return "Seguimiento comercial";
  return null;
}

function commercialOutcomeLabel(outcome?: AgendaItem["commercialOutcome"] | "") {
  if (outcome === "interested") return "Interesado";
  if (outcome === "not_interested") return "No interesado";
  if (outcome === "proposal_requested") return "Pidio propuesta";
  if (outcome === "follow_up_later") return "Recontactar mas adelante";
  if (outcome === "future_demo") return "Demo futura";
  if (outcome === "won") return "Venta cerrada";
  return null;
}

function commercialOutcomeVariant(outcome?: AgendaItem["commercialOutcome"] | "") {
  if (outcome === "won") return "success" as const;
  if (outcome === "proposal_requested" || outcome === "interested") return "warning" as const;
  if (outcome === "not_interested") return "danger" as const;
  return "outline" as const;
}

function isCommercialAgendaItem(item: Pick<AgendaItem, "commercialActionType" | "origin" | "type" | "title">) {
  if (item.commercialActionType) return true;
  if (item.origin === "lead_comercial_bot_handoff") return true;
  if (item.type !== "appointment") return false;
  return /visita comercial|demo comercial|seguimiento comercial/i.test(String(item.title || ""));
}

function isTodayKey(dateKey: string) {
  return dateKey === toDateKey(new Date());
}

function isCommercialAttentionItem(item: Pick<AgendaItem, "commercialActionType" | "status" | "nextActionAt" | "date">) {
  if (!("origin" in item) && !item.commercialActionType) return false;
  if (!isCommercialAgendaItem(item as Pick<AgendaItem, "commercialActionType" | "origin" | "type" | "title"> & Pick<AgendaItem, "status" | "nextActionAt" | "date">)) return false;
  if (item.status === "reschedule" || item.status === "pending") return true;
  if (item.status === "confirmed" && isTodayKey(item.date)) return true;
  if (!item.nextActionAt) return false;
  return new Date(item.nextActionAt).getTime() <= Date.now();
}

function commercialPriorityRank(item: Pick<AgendaItem, "commercialActionType" | "origin" | "type" | "title" | "status" | "nextActionAt" | "date">) {
  if (!isCommercialAgendaItem(item)) return 50;
  if (item.status === "reschedule") return 0;
  if (item.status === "pending" && isTodayKey(item.date)) return 1;
  if (item.status === "confirmed" && isTodayKey(item.date)) return 2;
  if (item.status === "pending") return 3;
  if (item.nextActionAt && new Date(item.nextActionAt).getTime() <= Date.now()) return 4;
  if (item.status === "done") return 8;
  if (item.status === "cancelled") return 9;
  return 5;
}

function commercialSurfaceClass(item: Pick<AgendaItem, "commercialActionType" | "origin" | "type" | "title" | "status" | "date" | "nextActionAt" | "assignedUserId">, currentUserId?: string | null) {
  if (!isCommercialAgendaItem(item)) return "";
  if (item.status === "reschedule") return "border-amber-400/45 bg-amber-500/[0.12]";
  if (item.status === "confirmed") return "border-emerald-400/35 bg-emerald-500/[0.12]";
  if (item.status === "pending" && isTodayKey(item.date)) return "border-brand/55 bg-brand/[0.12]";
  if (currentUserId && item.assignedUserId === currentUserId) return "border-sky-400/30 bg-sky-500/[0.10]";
  return "border-fuchsia-400/25 bg-fuchsia-500/[0.08]";
}

function statusMeta(status: AgendaStatus, commercial?: boolean | null) {
  if (status === "done") return { label: commercial ? "Realizada" : "Hecho", variant: "success" as const };
  if (status === "confirmed") return { label: "Confirmada", variant: "success" as const };
  if (status === "reschedule") return { label: "Reprogramar", variant: "warning" as const };
  if (status === "cancelled") return { label: "Cancelada", variant: "danger" as const };
  return { label: "Pendiente", variant: "warning" as const };
}

function buildCommercialNextAction(item: Pick<AgendaItem, "commercialActionType" | "commercialOutcome" | "status" | "startTime" | "date" | "resultNote" | "nextStepNote" | "nextActionAt">) {
  const label = commercialActionLabel(item.commercialActionType) || "Accion comercial";
  const outcomeLabel = commercialOutcomeLabel(item.commercialOutcome);
  const scheduledAt = item.nextActionAt || toConversationNextActionAt(item.date, item.startTime);

  if (item.status === "done") {
    return {
      nextActionAt: item.nextActionAt || null,
      nextActionNote: item.nextStepNote?.trim() || outcomeLabel || item.resultNote?.trim() || `${label} realizada`
    };
  }
  if (item.status === "reschedule") {
    return {
      nextActionAt: item.nextActionAt || null,
      nextActionNote: item.nextStepNote?.trim() || `${label} a reprogramar`
    };
  }
  if (item.status === "cancelled") {
    return {
      nextActionAt: item.nextActionAt || null,
      nextActionNote: item.nextStepNote?.trim() || `${label} cancelada`
    };
  }
  if (item.status === "confirmed") {
    return {
      nextActionAt: scheduledAt,
      nextActionNote: `${label} confirmada en Agenda`
    };
  }
  return {
    nextActionAt: scheduledAt,
    nextActionNote: `${label} agendada en Agenda`
  };
}

export function AgendaWorkspace({ currentUserId, sellerOptions = [], initialCommercialPrefill }: AgendaWorkspaceProps) {
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
  const [draft, setDraft] = useState<DraftState>(() => createDraftState(initialCommercialPrefill));
  const [editDraft, setEditDraft] = useState<EditState | null>(null);
  const [visitScope, setVisitScope] = useState<"all" | "mine">("all");
  const [commercialView, setCommercialView] = useState<"all" | "commercial">("all");

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
      count: items.filter((item) => item.date === dateKey && item.status !== "cancelled").length,
      commercialCount: items.filter((item) => item.date === dateKey && isCommercialAgendaItem(item) && item.status !== "cancelled").length,
      attentionCount: items.filter((item) => item.date === dateKey && item.status !== "cancelled" && isCommercialAttentionItem(item)).length
    };
  });

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);

  const selectedItems = items
    .filter((item) => item.date === selectedDateKey)
    .filter((item) => visitScope === "all" || !isCommercialAgendaItem(item) || item.assignedUserId === currentUserId)
    .filter((item) => commercialView === "all" || isCommercialAgendaItem(item))
    .sort((a, b) => {
      const priorityDiff = commercialPriorityRank(a) - commercialPriorityRank(b);
      if (priorityDiff !== 0) return priorityDiff;
      return `${a.startTime || "99:99"}${a.createdAt || ""}`.localeCompare(`${b.startTime || "99:99"}${b.createdAt || ""}`);
    });

  const monthItems = items.filter((item) => item.date >= toDateKey(monthStart) && item.date <= toDateKey(monthEnd));
  const monthCommercialItems = monthItems.filter((item) => isCommercialAgendaItem(item) && item.status !== "cancelled");
  const myCommercialCount = monthItems.filter((item) => isCommercialAgendaItem(item) && item.status !== "cancelled" && item.assignedUserId === currentUserId).length;
  const appointmentCount = monthItems.filter((item) => item.type === "appointment" && item.status !== "cancelled").length;
  const commercialCount = monthItems.filter((item) => isCommercialAgendaItem(item) && item.status !== "cancelled").length;
  const interestedCount = monthCommercialItems.filter((item) => item.commercialOutcome === "interested").length;
  const proposalRequestedCount = monthCommercialItems.filter((item) => item.commercialOutcome === "proposal_requested").length;
  const wonCount = monthCommercialItems.filter((item) => item.commercialOutcome === "won").length;
  const notInterestedCount = monthCommercialItems.filter((item) => item.commercialOutcome === "not_interested").length;
  const blockedCount = monthItems.filter((item) => item.type === "blocked" && item.status !== "cancelled").length;
  const availabilityCount = monthItems.filter((item) => item.type === "availability" && item.status !== "cancelled").length;
  const pendingCount = monthItems.filter((item) => item.status === "pending").length;
  const selectedAvailability = selectedItems.filter((item) => item.type === "availability" && item.status !== "cancelled");
  const selectedBlocked = selectedItems.filter((item) => item.type === "blocked" && item.status !== "cancelled");
  const selectedAppointments = selectedItems.filter((item) => item.type === "appointment" && item.status !== "cancelled");
  const selectedCommercial = selectedItems.filter((item) => isCommercialAgendaItem(item));
  const selectedAttentionItems = selectedCommercial.filter((item) => isCommercialAttentionItem(item));
  const selectedConfirmed = selectedCommercial.filter((item) => item.status === "confirmed");
  const selectedTodayCommercial = selectedCommercial.filter((item) => isTodayKey(item.date));
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

  async function syncConversationNextAction(item: Pick<AgendaItem, "conversationId" | "commercialActionType" | "commercialOutcome" | "status" | "date" | "startTime" | "resultNote" | "nextStepNote" | "nextActionAt">) {
    if (!item.conversationId || !item.commercialActionType) return;
    const payload = buildCommercialNextAction(item);
    await fetch(`/api/app/inbox/${item.conversationId}/next-action`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }).catch(() => null);
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
          conversationId: draft.conversationId || null,
          assignedUserId: draft.assignedUserId || null,
          assignedUserName: sellerOptions.find((seller) => seller.id === draft.assignedUserId)?.name || null,
          type: draft.type,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          status: "pending",
          commercialActionType: draft.commercialActionType || null,
          commercialOutcome: draft.commercialOutcome || null,
          origin: draft.origin || null,
          location: draft.location.trim() || null,
          resultNote: draft.resultNote.trim() || null,
          nextStepNote: draft.nextStepNote.trim() || null,
          nextActionAt: draft.nextActionAt ? new Date(draft.nextActionAt).toISOString() : null,
          contactNameSnapshot: draft.contactNameSnapshot.trim() || null,
          phoneSnapshot: draft.phoneSnapshot.trim() || null
        })
      });
      const json = (await response.json().catch(() => null)) as { data?: AgendaItem; detail?: string; error?: string } | null;

      if (!response.ok || !json?.data) {
        throw new Error(json?.detail || json?.error || "No pudimos guardar el item.");
      }

      const nextItem = json.data;
      setItems((current) => [...current, nextItem]);
      await syncConversationNextAction({
        conversationId: draft.conversationId || null,
        commercialActionType: draft.commercialActionType || null,
        commercialOutcome: draft.commercialOutcome || null,
        status: "pending",
        date: selectedDateKey,
        startTime: draft.startTime || null,
        resultNote: draft.resultNote || null,
        nextStepNote: draft.nextStepNote || null,
        nextActionAt: draft.nextActionAt ? new Date(draft.nextActionAt).toISOString() : null
      });
      setDraft(createDraftState());
      setRefreshSeed((current) => current + 1);
      const commercialSuccessLabel = draft.commercialActionType ? commercialActionLabel(draft.commercialActionType) : null;
      toast.success(
        commercialSuccessLabel
          ? `${commercialSuccessLabel} agendada`
          : draft.type === "appointment"
            ? "Turno reservado"
            : "Item creado",
        draft.commercialActionType
          ? "La agenda ya dejo el seguimiento comercial vinculado a la conversacion."
          : draft.contactId
            ? "La agenda guardo el item y su contacto asociado."
            : "La agenda ya guardo el item en este tenant."
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
      await syncConversationNextAction({
        conversationId: nextItem.conversationId || null,
        commercialActionType: nextItem.commercialActionType || null,
        commercialOutcome: nextItem.commercialOutcome || null,
        status: nextItem.status,
        date: nextItem.date,
        startTime: nextItem.startTime || null,
        resultNote: nextItem.resultNote || null,
        nextStepNote: nextItem.nextStepNote || null,
        nextActionAt: nextItem.nextActionAt || null
      });
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
          assignedUserId: editDraft.type === "blocked" || editDraft.type === "availability" ? null : editDraft.assignedUserId || null,
          assignedUserName:
            editDraft.type === "blocked" || editDraft.type === "availability"
              ? null
              : sellerOptions.find((seller) => seller.id === editDraft.assignedUserId)?.name || null,
          startTime: editDraft.startTime || null,
          endTime: editDraft.endTime || null,
          status: editDraft.status
          ,
          resultNote: editDraft.resultNote.trim() || null,
          nextStepNote: editDraft.nextStepNote.trim() || null,
          nextActionAt: editDraft.nextActionAt ? new Date(editDraft.nextActionAt).toISOString() : null
          ,
          commercialOutcome: editDraft.commercialOutcome || null
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
      await syncConversationNextAction({
        conversationId: nextItem.conversationId || null,
        commercialActionType: nextItem.commercialActionType || null,
        commercialOutcome: nextItem.commercialOutcome || null,
        status: nextItem.status,
        date: nextItem.date,
        startTime: nextItem.startTime || null,
        resultNote: nextItem.resultNote || null,
        nextStepNote: nextItem.nextStepNote || null,
        nextActionAt: nextItem.nextActionAt || null
      });
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            {availabilityCount} bloques disponibles, {blockedCount} bloqueos, {pendingCount} items pendientes y {commercialCount} visitas/demo comerciales activas.
            {currentUserId ? ` ${myCommercialCount} asignadas a ti.` : ""}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">{commercialCount} comerciales</Badge>}>
            <div>
              <CardTitle className="text-lg">Resultados Del Mes</CardTitle>
              <CardDescription>Lectura minima de visitas y demos comerciales cargadas en el mes visible.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0 text-sm text-muted">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-fuchsia-100/80">Total</p>
                <p className="mt-1 text-xl font-semibold text-fuchsia-100">{commercialCount}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-amber-100/80">Interesados</p>
                <p className="mt-1 text-xl font-semibold text-amber-100">{interestedCount}</p>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-sky-100/80">Propuesta</p>
                <p className="mt-1 text-xl font-semibold text-sky-100">{proposalRequestedCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-100/80">Cerrados</p>
                <p className="mt-1 text-xl font-semibold text-emerald-100">{wonCount}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-100">
              <p className="text-[11px] uppercase tracking-[0.16em] text-rose-100/80">No interesados</p>
              <p className="mt-1 text-lg font-semibold">{notInterestedCount}</p>
            </div>
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
                      {day.commercialCount > 0 ? <div className="h-1.5 rounded-full bg-fuchsia-400/70" /> : null}
                      {day.attentionCount > 0 ? <div className="h-1.5 rounded-full bg-amber-400/80" /> : null}
                      {day.count > 0 ? (
                        <>
                          <div className="h-2 rounded-full bg-brand/40" />
                          <p className="text-xs text-muted">{day.count} item(s)</p>
                          {day.commercialCount > 0 ? <p className="text-[11px] text-fuchsia-200">{day.commercialCount} comercial(es)</p> : null}
                          {day.attentionCount > 0 ? <p className="text-[11px] text-amber-200">{day.attentionCount} requiere accion</p> : null}
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
            <CardHeader
              action={
                <div className="flex items-center gap-2">
                  {currentUserId ? (
                    <div className="inline-flex rounded-xl border border-[color:var(--border)] bg-bg/50 p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setVisitScope("all")}
                        className={cn("rounded-lg px-2.5 py-1 transition", visitScope === "all" ? "bg-brand text-white" : "text-muted")}
                      >
                        Todas
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisitScope("mine")}
                        className={cn("rounded-lg px-2.5 py-1 transition", visitScope === "mine" ? "bg-brand text-white" : "text-muted")}
                      >
                        Mis visitas
                      </button>
                    </div>
                  ) : null}
                  <Badge variant="muted">{selectedItems.length} item(s)</Badge>
                </div>
              }
            >
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

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-3 text-sm text-fuchsia-100">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-fuchsia-200/80">Comerciales</p>
                  <p className="mt-2 text-xl font-semibold">{selectedCommercial.length}</p>
                  <p className="mt-1 text-xs text-fuchsia-100/75">Visitas y demos visibles en este dia.</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-amber-200/80">Requieren accion</p>
                  <p className="mt-2 text-xl font-semibold">{selectedAttentionItems.length}</p>
                  <p className="mt-1 text-xs text-amber-100/75">Pendientes, reprogramar o con urgencia operativa.</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-200/80">Confirmadas</p>
                  <p className="mt-2 text-xl font-semibold">{selectedConfirmed.length}</p>
                  <p className="mt-1 text-xs text-emerald-100/75">Listas para ejecucion comercial.</p>
                </div>
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-100">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-sky-200/80">De hoy</p>
                  <p className="mt-2 text-xl font-semibold">{selectedTodayCommercial.length}</p>
                  <p className="mt-1 text-xs text-sky-100/75">Agenda comercial a resolver hoy.</p>
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

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-[color:var(--border)] bg-bg/50 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setCommercialView("all")}
                    className={cn("rounded-lg px-2.5 py-1 transition", commercialView === "all" ? "bg-brand text-white" : "text-muted")}
                  >
                    Todo
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommercialView("commercial")}
                    className={cn("rounded-lg px-2.5 py-1 transition", commercialView === "commercial" ? "bg-brand text-white" : "text-muted")}
                  >
                    Solo comercial
                  </button>
                </div>
                <Badge variant="warning">Prioridad alta: reprogramar, pendientes y confirmadas de hoy</Badge>
              </div>

              {initialCommercialPrefill?.conversationId ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">{commercialActionLabel(initialCommercialPrefill.actionType) || "Accion comercial"}</Badge>
                    <Badge variant="outline">Lead derivado desde Inbox</Badge>
                  </div>
                  <p className="mt-2 leading-6">
                    Esta agenda vino precompletada para{" "}
                    <span className="font-medium text-white">{initialCommercialPrefill.contactName || "este lead"}</span>.
                    Al guardar, la visita/demo queda vinculada a la conversacion original y visible en seguimiento.
                  </p>
                </div>
              ) : null}

              {selectedItems.length ? (
                selectedItems.map((item) => {
                  const meta = typeMeta(item.type);
                  const isCommercial = isCommercialAgendaItem(item);
                  const status = statusMeta(item.status, isCommercial);
                  const isBusy = mutationBusyId === item.id;
                  const commercialLabel = commercialActionLabel(item.commercialActionType) || (isCommercial ? "Accion comercial" : null);
                  const outcomeLabel = commercialOutcomeLabel(item.commercialOutcome);
                  const requiresAttention = isCommercialAttentionItem(item);

                  return (
                    <div key={item.id} className={cn("rounded-2xl border p-4", getItemSurface(item.type), commercialSurfaceClass(item, currentUserId))}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <Badge variant="outline">{formatTimeLabel(item)}</Badge>
                            {commercialLabel ? <Badge variant="warning">{commercialLabel}</Badge> : null}
                            {outcomeLabel ? <Badge variant={commercialOutcomeVariant(item.commercialOutcome)}>{outcomeLabel}</Badge> : null}
                            {requiresAttention ? <Badge variant="danger">Requiere accion</Badge> : null}
                            {isCommercial && isTodayKey(item.date) ? <Badge variant="outline">Hoy</Badge> : null}
                            {item.assignedUserName ? <Badge variant="outline">Responsable: {item.assignedUserName}</Badge> : null}
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
                      {commercialLabel || item.origin || item.location || item.conversationId ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                          {item.contact?.name ? (
                            <span className="rounded-full border border-[color:var(--border)] bg-bg/50 px-3 py-1 text-text">Contacto: {item.contact.name}</span>
                          ) : null}
                          {item.origin ? (
                            <span className="rounded-full border border-[color:var(--border)] bg-bg/50 px-3 py-1">{item.origin}</span>
                          ) : null}
                          {item.location ? (
                            <span className="rounded-full border border-[color:var(--border)] bg-bg/50 px-3 py-1">Ubicacion: {item.location}</span>
                          ) : null}
                          {item.conversationId ? (
                            <Link
                              href={`/app/inbox/${item.conversationId}`}
                              className="rounded-full border border-[color:var(--border)] bg-bg/50 px-3 py-1 text-text hover:bg-bg/70"
                            >
                              Ver conversacion {item.contact?.name ? `de ${item.contact.name}` : ""}
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                      {item.resultNote || item.nextStepNote || item.nextActionAt ? (
                        <div className="mt-3 space-y-2 rounded-2xl border border-[color:var(--border)] bg-bg/40 p-3 text-sm text-muted">
                          {outcomeLabel ? (
                            <p>
                              <span className="font-medium text-text">Resultado comercial:</span> {outcomeLabel}
                            </p>
                          ) : null}
                          {item.resultNote ? (
                            <p>
                              <span className="font-medium text-text">Resultado:</span> {item.resultNote}
                            </p>
                          ) : null}
                          {item.nextStepNote ? (
                            <p>
                              <span className="font-medium text-text">Proximo paso:</span> {item.nextStepNote}
                            </p>
                          ) : null}
                          {item.nextActionAt ? (
                            <p>
                              <span className="font-medium text-text">Proxima accion:</span>{" "}
                              {new Date(item.nextActionAt).toLocaleString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "pending")} disabled={isBusy || item.status === "pending"}>
                          Pendiente
                        </Button>
                        {isCommercial ? (
                          <>
                            <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "confirmed")} disabled={isBusy || item.status === "confirmed"}>
                              Confirmada
                            </Button>
                            <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "done")} disabled={isBusy || item.status === "done"}>
                              Realizada
                            </Button>
                            <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "reschedule")} disabled={isBusy || item.status === "reschedule"}>
                              Reprogramar
                            </Button>
                          </>
                        ) : (
                          <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "done")} disabled={isBusy || item.status === "done"}>
                            Hecho
                          </Button>
                        )}
                        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "cancelled")} disabled={isBusy || item.status === "cancelled"}>
                          {isCommercial ? "Cancelada" : "Cancelar"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-bg/35 p-4 text-sm leading-6 text-muted">
                  {commercialView === "commercial"
                    ? "Todavia no hay items comerciales para este dia. Si registras una visita, demo o seguimiento comercial, va a quedar visible aca."
                    : "Todavia no hay items para este dia. Puedes guardar una nota, un seguimiento, una tarea, una franja disponible o un bloqueo simple."}
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
                        {editDraft.commercialActionType ? <option value="confirmed">Confirmada</option> : null}
                        <option value="done">{editDraft.commercialActionType ? "Realizada" : "Hecho"}</option>
                        {editDraft.commercialActionType ? <option value="reschedule">Reprogramar</option> : null}
                        <option value="cancelled">{editDraft.commercialActionType ? "Cancelada" : "Cancelado"}</option>
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

                  {editDraft.type !== "blocked" && editDraft.type !== "availability" ? (
                    <label className="mt-4 block space-y-2 text-sm">
                      <span className="font-medium">Responsable</span>
                      <select
                        value={editDraft.assignedUserId}
                        onChange={(event) => setEditDraft((current) => (current ? { ...current, assignedUserId: event.target.value } : current))}
                        className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <option value="">Sin asignar</option>
                        {sellerOptions.map((seller) => (
                          <option key={seller.id} value={seller.id}>
                            {seller.name}{seller.role ? ` · ${seller.role}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

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

                  {editDraft.commercialActionType ? (
                    <div className="mt-4 grid gap-4">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium">Resultado comercial</span>
                        <select
                          value={editDraft.commercialOutcome}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, commercialOutcome: event.target.value as EditState["commercialOutcome"] } : current))}
                          className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <option value="">Sin resultado estructurado</option>
                          <option value="interested">Interesado</option>
                          <option value="not_interested">No interesado</option>
                          <option value="proposal_requested">Pidio propuesta</option>
                          <option value="follow_up_later">Recontactar mas adelante</option>
                          <option value="future_demo">Demo futura</option>
                          <option value="won">Venta cerrada</option>
                        </select>
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium">Resultado o nota de visita</span>
                        <Textarea
                          value={editDraft.resultNote}
                          onChange={(event) => setEditDraft((current) => (current ? { ...current, resultNote: event.target.value } : current))}
                          className="min-h-24"
                          placeholder="Que paso en la visita/demo, objeciones, interes real o contexto relevante."
                        />
                      </label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm">
                          <span className="font-medium">Proximo paso</span>
                          <Textarea
                            value={editDraft.nextStepNote}
                            onChange={(event) => setEditDraft((current) => (current ? { ...current, nextStepNote: event.target.value } : current))}
                            className="min-h-24"
                            placeholder="Ej. enviar propuesta, recontactar, confirmar decision."
                          />
                        </label>
                        <label className="space-y-2 text-sm">
                          <span className="font-medium">Proxima fecha de accion</span>
                          <Input
                            type="datetime-local"
                            value={editDraft.nextActionAt}
                            onChange={(event) => setEditDraft((current) => (current ? { ...current, nextActionAt: event.target.value } : current))}
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

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
            <CardHeader action={<Badge variant="warning">Creacion manual</Badge>}>
              <div>
                <CardTitle className="text-xl">Crear item del dia</CardTitle>
                <CardDescription>La experiencia visual se mantiene y ahora tambien puedes registrar una visita o demo comercial vinculada al lead.</CardDescription>
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

              {draft.type !== "blocked" && draft.type !== "availability" ? (
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Responsable</span>
                  <select
                    value={draft.assignedUserId}
                    onChange={(event) => setDraft((current) => ({ ...current, assignedUserId: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="">{currentUserId ? "Sin asignar" : "Sin responsable"}</option>
                    {sellerOptions.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}{seller.role ? ` · ${seller.role}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {draft.type === "appointment" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Accion comercial</span>
                    <select
                      value={draft.commercialActionType}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          commercialActionType: event.target.value as DraftState["commercialActionType"],
                          title: event.target.value
                            ? buildCommercialTitle(event.target.value as "visit" | "demo", current.contactNameSnapshot || contacts.find((contact) => contact.id === current.contactId)?.name)
                            : current.title
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <option value="">Turno general</option>
                      <option value="visit">Visita comercial</option>
                      <option value="demo">Demo comercial</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Ubicacion / direccion</span>
                    <Input value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Direccion, comercio o referencia de la demo" />
                  </label>
                </div>
              ) : null}

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
                    : draft.commercialActionType
                      ? `${commercialActionLabel(draft.commercialActionType)}${draft.conversationId ? " vinculada a la conversacion en handoff comercial." : " lista para seguimiento comercial."}`
                      : draft.assignedUserId
                        ? `Este item quedara asignado a ${sellerOptions.find((seller) => seller.id === draft.assignedUserId)?.name || "un responsable del equipo"}.`
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
                  placeholder={draft.commercialActionType ? "Detalles de la visita/demo, objetivo comercial o referencias utiles para la reunion." : "Contexto, pendiente o instruccion interna para este item."}
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

        </div>
      </section>
    </div>
  );
}
