"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PortalAgendaAvailabilityDay, PortalContact } from "@/lib/api";
import {
  Ban,
  CalendarCheck2,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  LoaderCircle,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Rows3
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

type AgendaViewMode = "month" | "week" | "day" | "agenda";

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

function startOfWeek(date: Date) {
  const next = new Date(date);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
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

function formatLongDate(value: string) {
  return parseDateKey(value).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function formatShortDate(value: string) {
  return parseDateKey(value).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

function matchesAgendaSearch(item: AgendaItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return [
    item.title,
    item.description,
    item.contact?.name,
    item.contact?.phone,
    item.assignedUserName,
    commercialActionLabel(item.commercialActionType),
    formatShortDate(item.date),
    formatLongDate(item.date)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function getAgendaItemChipClass(item: AgendaItem) {
  if (item.type === "availability") return "border-emerald-500/30 bg-emerald-500/12 text-emerald-100";
  if (item.type === "blocked") return "border-rose-500/30 bg-rose-500/12 text-rose-100";
  if (item.status === "confirmed") return "border-emerald-400/30 bg-emerald-500/12 text-emerald-100";
  if (isCommercialAgendaItem(item)) return "border-fuchsia-400/30 bg-fuchsia-500/12 text-fuchsia-100";
  return "border-sky-500/25 bg-sky-500/10 text-sky-100";
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
  const todayKey = useMemo(() => toDateKey(today), [today]);
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
  const [viewMode, setViewMode] = useState<AgendaViewMode>("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPool, setSearchPool] = useState<AgendaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

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

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchPool([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const from = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 6, 1);
    const to = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 7, 0);

    async function loadSearchPool() {
      setSearchLoading(true);
      try {
        const response = await fetch(
          `/api/app/agenda?from=${encodeURIComponent(toDateKey(from))}&to=${encodeURIComponent(toDateKey(to))}`,
          { cache: "no-store", signal: controller.signal }
        );
        const json = (await response.json().catch(() => null)) as
          | { data?: { items?: AgendaItem[] }; detail?: string; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(json?.detail || json?.error || "No pudimos consultar la agenda.");
        }

        setSearchPool(Array.isArray(json?.data?.items) ? json.data.items : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearchPool([]);
        toast.error("No pudimos buscar en agenda", error instanceof Error ? error.message : "unknown_error");
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }

    void loadSearchPool();
    return () => controller.abort();
  }, [currentMonth, searchQuery]);

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
  const selectedDateLabel = useMemo(() => formatLongDate(selectedDateKey), [selectedDateKey]);

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
  const todayItems = items.filter((item) => item.date === todayKey && item.status !== "cancelled");
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
  const todayAppointmentCount = todayItems.filter((item) => item.type === "appointment").length;
  const todayPendingCount = todayItems.filter((item) => item.status === "pending").length;
  const todayConfirmedCount = todayItems.filter((item) => item.status === "confirmed").length;
  const todayCommercialCount = todayItems.filter((item) => isCommercialAgendaItem(item)).length;
  const activePriorityCopy = selectedAttentionItems.length
    ? "Alta: reprogramar, pendientes y confirmadas de hoy"
    : selectedConfirmed.length
      ? "Media: confirmar detalles y ejecutar agenda del dia"
      : "Baja: sin urgencias operativas visibles en esta fecha";
  const searchResults = useMemo(
    () =>
      [...(searchPool.length ? searchPool : items)]
        .filter((item) => item.status !== "cancelled")
        .filter((item) => matchesAgendaSearch(item, searchQuery))
        .sort((a, b) => `${a.date}-${a.startTime || "99:99"}-${a.title}`.localeCompare(`${b.date}-${b.startTime || "99:99"}-${b.title}`))
        .slice(0, 8),
    [items, searchPool, searchQuery]
  );
  const weekDays = useMemo(() => {
    const from = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(from);
      date.setDate(from.getDate() + index);
      const dateKey = toDateKey(date);
      const dayItems = items
        .filter((item) => item.date === dateKey && item.status !== "cancelled")
        .sort((a, b) => `${a.startTime || "99:99"}-${a.title}`.localeCompare(`${b.startTime || "99:99"}-${b.title}`));
      return {
        date,
        dateKey,
        isSelected: dateKey === selectedDateKey,
        isToday: dateKey === todayKey,
        items: dayItems
      };
    });
  }, [items, selectedDate, selectedDateKey, todayKey]);
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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(192,80,0,0.24),transparent_24%),linear-gradient(180deg,rgba(12,16,24,0.98),rgba(9,13,20,0.96))] p-4 shadow-[var(--card-shadow)] md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Badge variant="warning">Agenda nativa</Badge>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Agenda</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Organiza disponibilidad, seguimientos, notas internas y reserva de turnos desde conversaciones.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted">{monthLabels[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Badge>
              <Badge variant="success">Portal activo</Badge>
              <Badge variant="outline">Operacion en vivo</Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <AgendaKpiCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Hoy"
              value={today.getDate()}
              helper={`${monthLabels[today.getMonth()].toLowerCase()}, ${today.toLocaleDateString("es-AR", { weekday: "long" })}`}
              tone="violet"
            />
            <AgendaKpiCard icon={<Clock3 className="h-4 w-4" />} label="Turnos hoy" value={todayAppointmentCount} helper={todayAppointmentCount ? "Items reservados hoy" : "Sin turnos"} tone="orange" />
            <AgendaKpiCard icon={<Rows3 className="h-4 w-4" />} label="Pendientes" value={todayPendingCount} helper={todayPendingCount ? "Pendientes del dia" : "Sin items pendientes"} tone="blue" />
            <AgendaKpiCard icon={<CheckCheck className="h-4 w-4" />} label="Confirmadas" value={todayConfirmedCount} helper={todayConfirmedCount ? "Confirmadas hoy" : "Sin confirmadas hoy"} tone="green" />
            <AgendaKpiCard icon={<Sparkles className="h-4 w-4" />} label="Comerciales" value={todayCommercialCount} helper={todayCommercialCount ? "Activos hoy" : "Sin agenda comercial hoy"} tone="amber" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_420px]">
        <Card className="overflow-hidden border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[156px] rounded-2xl border border-white/8 bg-black/15 px-4 py-2 text-sm font-medium text-white">
                  {monthLabels[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelectedDateKey(todayKey);
                  }}
                >
                  Hoy
                </Button>
              </div>

              <div className="flex flex-col gap-3 xl:min-w-[520px] xl:flex-row xl:items-center xl:justify-end">
                <div className="relative w-full xl:flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar por cliente, responsable o nota..."
                    className="h-11 rounded-2xl border-white/10 bg-black/15 pl-9"
                  />
                </div>
                <div className="inline-flex rounded-2xl border border-white/8 bg-black/15 p-1 text-xs">
                  {[
                    { key: "month", label: "Mes" },
                    { key: "week", label: "Semana" },
                    { key: "day", label: "Dia" },
                    { key: "agenda", label: "Agenda" }
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setViewMode(mode.key as AgendaViewMode)}
                      className={cn(
                        "rounded-xl px-3 py-2 transition",
                        viewMode === mode.key ? "bg-brand text-white shadow-[0_10px_25px_rgba(192,80,0,0.22)]" : "text-muted hover:text-white"
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {searchQuery.trim().length >= 2 ? (
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Buscador operativo</p>
                    <p className="mt-1 text-xs text-muted">Encuentra rapido fechas, horas y contexto para cada cliente.</p>
                  </div>
                  <Badge variant="outline">{searchLoading ? "Buscando..." : `${searchResults.length} coincidencia(s)`}</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {searchResults.length ? (
                    searchResults.map((item) => (
                      <button
                        key={`search-${item.id}`}
                        type="button"
                        onClick={() => {
                          const nextDate = parseDateKey(item.date);
                          setCurrentMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
                          setSelectedDateKey(item.date);
                          setViewMode("agenda");
                        }}
                        className="flex flex-col items-start gap-1 rounded-2xl border border-white/8 bg-surface/55 px-4 py-3 text-left transition hover:border-brand/40 hover:bg-brand/10"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{item.contact?.name || item.title}</span>
                          <Badge variant={typeMeta(item.type).variant}>{typeMeta(item.type).label}</Badge>
                        </div>
                        <p className="text-xs text-brandBright">
                          {formatShortDate(item.date)} {item.startTime ? `— ${item.startTime}` : "— sin hora"}
                        </p>
                        <p className="text-xs text-muted">{item.title}{item.description ? ` · ${item.description}` : ""}</p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-muted">
                      {searchLoading ? "Buscando coincidencias reales..." : "No encontramos coincidencias en la agenda cargada para ese termino."}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center text-sm text-muted">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Cargando agenda del mes...
              </div>
            ) : errorMessage ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMessage}</div>
            ) : (
              <>
                {viewMode === "month" ? (
                  <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black/12">
                    <div className="grid grid-cols-7 gap-px border-b border-white/8 bg-white/6">
                      {weekLabels.map((label) => (
                        <div key={label} className="px-3 py-3 text-center text-[11px] uppercase tracking-[0.18em] text-muted">
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-white/6">
                      {calendarDays.map((day) => {
                        const dayItems = items
                          .filter((item) => item.date === day.dateKey && item.status !== "cancelled")
                          .sort((a, b) => `${a.startTime || "99:99"}-${a.title}`.localeCompare(`${b.startTime || "99:99"}-${b.title}`))
                          .slice(0, 2);
                        return (
                          <button
                            key={day.dateKey}
                            type="button"
                            onClick={() => setSelectedDateKey(day.dateKey)}
                            className={cn(
                              "min-h-[132px] bg-[rgba(10,14,22,0.94)] p-3 text-left transition hover:bg-[rgba(16,22,34,0.98)]",
                              day.isSelected && "bg-[rgba(192,80,0,0.10)] shadow-[inset_0_0_0_1px_rgba(192,80,0,0.32)]",
                              !day.inCurrentMonth && "opacity-45"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn("text-sm font-medium text-white", day.isToday && "text-brandBright")}>{day.date.getDate()}</span>
                              {day.isToday ? <Badge variant="warning">Hoy</Badge> : null}
                            </div>
                            <div className="mt-3 space-y-2">
                              {dayItems.length ? (
                                dayItems.map((item) => (
                                  <div key={item.id} className={cn("rounded-xl border px-2.5 py-2 text-[11px]", getAgendaItemChipClass(item))}>
                                    <p className="font-medium">{item.startTime || "Sin hora"}</p>
                                    <p className="truncate opacity-90">{item.contact?.name || item.title}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted">Libre</p>
                              )}
                              {day.count > 2 ? <p className="text-[11px] text-muted">+{day.count - 2} item(s) mas</p> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {viewMode === "week" ? (
                  <div className="grid gap-3 lg:grid-cols-7">
                    {weekDays.map((day) => (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => setSelectedDateKey(day.dateKey)}
                        className={cn(
                          "rounded-[24px] border p-4 text-left transition",
                          day.isSelected ? "border-brand/40 bg-brand/10" : "border-white/8 bg-black/12 hover:bg-black/20"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
                              {weekLabels[(day.date.getDay() + 6) % 7]}
                            </p>
                            <p className={cn("mt-1 text-xl font-semibold text-white", day.isToday && "text-brandBright")}>{day.date.getDate()}</p>
                          </div>
                          {day.isToday ? <Badge variant="warning">Hoy</Badge> : null}
                        </div>
                        <div className="mt-4 space-y-2">
                          {day.items.length ? (
                            day.items.slice(0, 4).map((item) => (
                              <div key={item.id} className={cn("rounded-xl border px-2.5 py-2 text-[11px]", getAgendaItemChipClass(item))}>
                                <p className="font-medium">{item.startTime || "Sin hora"}</p>
                                <p className="truncate opacity-90">{item.contact?.name || item.title}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted">Sin items</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {viewMode === "day" ? (
                  <div className="rounded-[24px] border border-white/8 bg-black/12 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{selectedDateLabel}</p>
                        <p className="mt-1 text-xs text-muted">Vista diaria enfocada en horario, responsable y estado comercial.</p>
                      </div>
                      <Badge variant="muted">{selectedItems.length} item(s)</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedItems.length ? (
                        selectedItems.map((item) => (
                          <div key={`day-${item.id}`} className={cn("rounded-2xl border p-4", getItemSurface(item.type), commercialSurfaceClass(item, currentUserId))}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-white">{item.title}</p>
                                <p className="mt-1 text-xs text-muted">
                                  {formatTimeLabel(item)}{item.contact?.name ? ` · ${item.contact.name}` : ""}{item.assignedUserName ? ` · ${item.assignedUserName}` : ""}
                                </p>
                              </div>
                              <Badge variant={statusMeta(item.status, isCommercialAgendaItem(item)).variant}>
                                {statusMeta(item.status, isCommercialAgendaItem(item)).label}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-sm text-muted">
                          No hay items en esta fecha.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {viewMode === "agenda" ? (
                  <div className="rounded-[24px] border border-white/8 bg-black/12 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">Agenda operativa del periodo</p>
                        <p className="mt-1 text-xs text-muted">Lista cronologica del mes visible para escanear rapido pendientes, demos y turnos.</p>
                      </div>
                      <Badge variant="muted">{monthItems.filter((item) => item.status !== "cancelled").length} item(s)</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {monthItems.filter((item) => item.status !== "cancelled").length ? (
                        [...monthItems]
                          .filter((item) => item.status !== "cancelled")
                          .sort((a, b) => `${a.date}-${a.startTime || "99:99"}-${a.title}`.localeCompare(`${b.date}-${b.startTime || "99:99"}-${b.title}`))
                          .map((item) => (
                            <button
                              key={`agenda-${item.id}`}
                              type="button"
                              onClick={() => setSelectedDateKey(item.date)}
                              className="flex w-full flex-col items-start gap-2 rounded-2xl border border-white/8 bg-surface/55 px-4 py-3 text-left transition hover:border-brand/40 hover:bg-brand/10"
                            >
                              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-white">{item.contact?.name || item.title}</span>
                                  <Badge variant={typeMeta(item.type).variant}>{typeMeta(item.type).label}</Badge>
                                  <Badge variant={statusMeta(item.status, isCommercialAgendaItem(item)).variant}>{statusMeta(item.status, isCommercialAgendaItem(item)).label}</Badge>
                                </div>
                                <span className="text-xs text-brandBright">{formatShortDate(item.date)} {item.startTime ? `· ${item.startTime}` : ""}</span>
                              </div>
                              <p className="text-xs text-muted">{item.title}{item.description ? ` · ${item.description}` : ""}</p>
                            </button>
                          ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-sm text-muted">
                          Todavia no hay items cargados para el mes visible.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">Resumen del dia</h3>
                  <p className="mt-1 text-sm text-muted">{selectedDateLabel}</p>
                </div>
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => setViewMode("agenda")}>
                  Ver agenda completa
                </Button>
              </div>

              <div className="space-y-2">
                <SummaryStrip icon={<CalendarCheck2 className="h-4 w-4" />} label="Disponible" tone="green" meta={`${selectedAvailability.length} item(s)`} copy={selectedAvailability.length ? selectedAvailability.map((item) => formatTimeLabel(item)).join(", ") : "Sin bloques base"} />
                <SummaryStrip icon={<Ban className="h-4 w-4" />} label="No disponible" tone="rose" meta={`${selectedBlocked.length} item(s)`} copy={selectedBlocked.length ? selectedBlocked.map((item) => formatTimeLabel(item)).join(", ") : "Sin bloqueos cargados"} />
                <SummaryStrip icon={<Clock3 className="h-4 w-4" />} label="Sin turnos" tone="orange" meta={selectedAppointments.length ? `${selectedAppointments.length} item(s)` : "Sin turnos para hoy"} copy={selectedAppointments.length ? selectedAppointments.map((item) => formatTimeLabel(item)).join(", ") : "Sin turnos para este dia"} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
            <CardContent className="space-y-4 p-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Vista rapida</h3>
                <p className="mt-1 text-sm text-muted">Lectura corta de operacion y estado comercial en la fecha seleccionada.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <QuickStatCard label="Visitas / demos" value={selectedCommercial.length} tone="violet" />
                <QuickStatCard label="Pendientes" value={selectedAttentionItems.length} tone="orange" />
                <QuickStatCard label="Confirmadas" value={selectedConfirmed.length} tone="green" />
                <QuickStatCard label="Agenda de hoy" value={selectedTodayCommercial.length} tone="blue" />
              </div>

              <div className="space-y-3 border-t border-white/8 pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <CircleAlert className="h-4 w-4 text-brandBright" />
                  Prioridad actual
                </div>
                <div className="inline-flex rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brandBright">
                  {activePriorityCopy}
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm leading-6 text-muted">
                  {selectedItems.length
                    ? "La agenda diaria ya consolida disponibilidad, bloqueos, pendientes y agenda comercial sobre la misma fuente real."
                    : "Todavia no hay items para este dia. Puedes guardar una nota, un seguimiento, una tarea, una franja disponible o un bloqueo simple."}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Consulta preparada para bot</p>
                    <p className="mt-1 text-xs text-muted">
                      {availabilityDay
                        ? availabilityDay.policy === "explicit_availability"
                          ? "El dia usa disponibilidad explicita y devuelve ventanas reservables."
                          : "El dia no define disponibilidad explicita y expone ocupados y bloqueos."
                        : "Estamos consultando la capa de disponibilidad del dia."}
                    </p>
                  </div>
                  <Badge variant="outline">{availabilityLoading ? "Consultando" : "Backend listo"}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availabilityDay?.bookableWindows?.length ? (
                    availabilityDay.bookableWindows.map((window) => (
                      <span key={`${window.date}-${window.startTime}-${window.endTime}`} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                        {window.startTime} - {window.endTime}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/8 bg-surface/65 px-3 py-1 text-xs text-muted">
                      {availabilityLoading ? "Consultando ventanas..." : "Sin ventanas reservables calculadas para este dia"}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">Agenda del dia</h3>
                  <p className="mt-1 text-sm text-muted">Filtra las tarjetas del panel por alcance comercial sin perder el contexto operativo.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {currentUserId ? (
                    <div className="inline-flex rounded-xl border border-white/8 bg-black/15 p-1 text-xs">
                      <button type="button" onClick={() => setVisitScope("all")} className={cn("rounded-lg px-2.5 py-1 transition", visitScope === "all" ? "bg-brand text-white" : "text-muted")}>Todas</button>
                      <button type="button" onClick={() => setVisitScope("mine")} className={cn("rounded-lg px-2.5 py-1 transition", visitScope === "mine" ? "bg-brand text-white" : "text-muted")}>Mis visitas</button>
                    </div>
                  ) : null}
                  <div className="inline-flex rounded-xl border border-white/8 bg-black/15 p-1 text-xs">
                    <button type="button" onClick={() => setCommercialView("all")} className={cn("rounded-lg px-2.5 py-1 transition", commercialView === "all" ? "bg-brand text-white" : "text-muted")}>Todo</button>
                    <button type="button" onClick={() => setCommercialView("commercial")} className={cn("rounded-lg px-2.5 py-1 transition", commercialView === "commercial" ? "bg-brand text-white" : "text-muted")}>Solo comercial</button>
                  </div>
                  <Badge variant="muted">{selectedItems.length} item(s)</Badge>
                </div>
              </div>

              {initialCommercialPrefill?.conversationId ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">{commercialActionLabel(initialCommercialPrefill.actionType) || "Accion comercial"}</Badge>
                    <Badge variant="outline">Lead derivado desde Inbox</Badge>
                  </div>
                  <p className="mt-2 leading-6">
                    Esta agenda vino precompletada para <span className="font-medium text-white">{initialCommercialPrefill.contactName || "este lead"}</span>. Al guardar, la visita/demo queda vinculada a la conversacion original.
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
                          <p className="font-medium text-white">{item.title}</p>
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
                        <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-black/12 px-3 py-2 text-sm text-muted">
                          <UserRound className="h-4 w-4 text-brandBright" />
                          <span>{item.contact.name}</span>
                          {item.contact.phone ? <span>- {item.contact.phone}</span> : null}
                        </div>
                      ) : null}
                      {commercialLabel || item.origin || item.location || item.conversationId ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                          {item.contact?.name ? <span className="rounded-full border border-white/8 bg-black/12 px-3 py-1 text-text">Contacto: {item.contact.name}</span> : null}
                          {item.origin ? <span className="rounded-full border border-white/8 bg-black/12 px-3 py-1">{item.origin}</span> : null}
                          {item.location ? <span className="rounded-full border border-white/8 bg-black/12 px-3 py-1">Ubicacion: {item.location}</span> : null}
                          {item.conversationId ? (
                            <Link href={`/app/inbox/${item.conversationId}`} className="rounded-full border border-white/8 bg-black/12 px-3 py-1 text-text hover:bg-black/20">
                              Ver conversacion {item.contact?.name ? `de ${item.contact.name}` : ""}
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                      {item.resultNote || item.nextStepNote || item.nextActionAt ? (
                        <div className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-black/12 p-3 text-sm text-muted">
                          {outcomeLabel ? <p><span className="font-medium text-text">Resultado comercial:</span> {outcomeLabel}</p> : null}
                          {item.resultNote ? <p><span className="font-medium text-text">Resultado:</span> {item.resultNote}</p> : null}
                          {item.nextStepNote ? <p><span className="font-medium text-text">Proximo paso:</span> {item.nextStepNote}</p> : null}
                          {item.nextActionAt ? (
                            <p>
                              <span className="font-medium text-text">Proxima accion:</span>{" "}
                              {new Date(item.nextActionAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "pending")} disabled={isBusy || item.status === "pending"}>Pendiente</Button>
                        {isCommercial ? (
                          <>
                            <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "confirmed")} disabled={isBusy || item.status === "confirmed"}>Confirmada</Button>
                            <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "done")} disabled={isBusy || item.status === "done"}>Realizada</Button>
                            <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "reschedule")} disabled={isBusy || item.status === "reschedule"}>Reprogramar</Button>
                          </>
                        ) : (
                          <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "done")} disabled={isBusy || item.status === "done"}>Hecho</Button>
                        )}
                        <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => void handleStatusChange(item, "cancelled")} disabled={isBusy || item.status === "cancelled"}>
                          {isCommercial ? "Cancelada" : "Cancelar"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-6 text-muted">
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

          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))]">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-white">Crear item del dia</h3>
                  <p className="mt-1 text-sm text-muted">Formulario compacto premium reutilizando la creacion real de Agenda.</p>
                </div>
                <Badge variant="warning">Creacion manual</Badge>
              </div>

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

function AgendaKpiCard({
  icon,
  label,
  value,
  helper,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
  tone: "violet" | "orange" | "blue" | "green" | "amber";
}) {
  const tones = {
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-100",
    orange: "border-brand/20 bg-brand/10 text-orange-100",
    blue: "border-sky-500/20 bg-sky-500/10 text-sky-100",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-100"
  } as const;

  return (
    <div className={cn("rounded-[22px] border p-4", tones[tone])}>
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/15">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{helper}</p>
    </div>
  );
}

function SummaryStrip({
  icon,
  label,
  copy,
  meta,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  copy: string;
  meta: string;
  tone: "green" | "rose" | "orange";
}) {
  const tones = {
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-100",
    orange: "border-amber-500/20 bg-amber-500/10 text-amber-100"
  } as const;

  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-2xl border px-4 py-3", tones[tone])}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <p className="mt-1 truncate text-xs opacity-80">{copy}</p>
      </div>
      <span className="shrink-0 text-xs opacity-90">{meta}</span>
    </div>
  );
}

function QuickStatCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "violet" | "orange" | "green" | "blue";
}) {
  const tones = {
    violet: "text-violet-300 border-violet-500/20 bg-violet-500/8",
    orange: "text-orange-300 border-brand/20 bg-brand/8",
    green: "text-emerald-300 border-emerald-500/20 bg-emerald-500/8",
    blue: "text-sky-300 border-sky-500/20 bg-sky-500/8"
  } as const;

  return (
    <div className={cn("rounded-2xl border p-4", tones[tone])}>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs">{label}</p>
    </div>
  );
}
