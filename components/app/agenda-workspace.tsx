"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  NotebookPen,
  Plus,
  UserRound
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/ui/cn";

type AgendaItemKind = "nota" | "seguimiento" | "tarea" | "turno";

type AgendaItem = {
  id: string;
  dateKey: string;
  title: string;
  kind: AgendaItemKind;
  note: string;
  contact: string;
  timeLabel: string;
};

type DraftState = {
  title: string;
  kind: AgendaItemKind;
  note: string;
  contact: string;
  timeLabel: string;
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

function buildSeedItems(baseDate: Date): AgendaItem[] {
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const inThreeDays = new Date(today);
  inThreeDays.setDate(today.getDate() + 3);

  return [
    {
      id: "seed-1",
      dateKey: toDateKey(today),
      title: "Seguimiento a lead caliente",
      kind: "seguimiento",
      note: "Volver a escribir despues de la propuesta enviada por WhatsApp.",
      contact: "Comercial Norte",
      timeLabel: "10:30"
    },
    {
      id: "seed-2",
      dateKey: toDateKey(today),
      title: "Bloque reservado para demos",
      kind: "turno",
      note: "Espacio sugerido para reuniones comerciales o reservas futuras del bot.",
      contact: "",
      timeLabel: "16:00"
    },
    {
      id: "seed-3",
      dateKey: toDateKey(tomorrow),
      title: "Actualizar nota interna del contacto",
      kind: "nota",
      note: "Registrar objeciones y proximo paso antes de reactivar la conversacion.",
      contact: "Tienda Centro",
      timeLabel: "09:15"
    },
    {
      id: "seed-4",
      dateKey: toDateKey(inThreeDays),
      title: "Confirmar disponibilidad semanal",
      kind: "tarea",
      note: "Definir franjas para que luego el bot pueda consultar y reservar.",
      contact: "",
      timeLabel: "12:00"
    }
  ];
}

function kindMeta(kind: AgendaItemKind) {
  if (kind === "turno") return { label: "Turno", variant: "success" as const };
  if (kind === "seguimiento") return { label: "Seguimiento", variant: "warning" as const };
  if (kind === "tarea") return { label: "Tarea", variant: "outline" as const };
  return { label: "Nota", variant: "muted" as const };
}

export function AgendaWorkspace() {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(today));
  const [items, setItems] = useState<AgendaItem[]>(() => buildSeedItems(today));
  const [draft, setDraft] = useState<DraftState>({
    title: "",
    kind: "nota",
    note: "",
    contact: "",
    timeLabel: ""
  });

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const calendarStart = new Date(monthStart);
  const startDay = (monthStart.getDay() + 6) % 7;
  calendarStart.setDate(monthStart.getDate() - startDay);

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
      count: items.filter((item) => item.dateKey === dateKey).length
    };
  });

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateKey]);

  const selectedItems = items
    .filter((item) => item.dateKey === selectedDateKey)
    .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));

  const monthItems = items.filter((item) => {
    const itemDate = new Date(`${item.dateKey}T00:00:00`);
    return itemDate >= monthStart && itemDate <= monthEnd;
  });

  const turnoCount = monthItems.filter((item) => item.kind === "turno").length;
  const seguimientoCount = monthItems.filter((item) => item.kind === "seguimiento").length;
  const pendingCount = monthItems.filter((item) => item.kind === "tarea" || item.kind === "nota").length;

  function handleMonthShift(direction: -1 | 1) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  function handleCreateItem() {
    if (!draft.title.trim()) return;

    const nextItem: AgendaItem = {
      id: `agenda-${Date.now()}`,
      dateKey: selectedDateKey,
      title: draft.title.trim(),
      kind: draft.kind,
      note: draft.note.trim(),
      contact: draft.contact.trim(),
      timeLabel: draft.timeLabel.trim() || "Sin hora"
    };

    setItems((current) => [...current, nextItem]);
    setDraft({
      title: "",
      kind: "nota",
      note: "",
      contact: "",
      timeLabel: ""
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="success">Nativo</Badge>}>
            <div>
              <CardTitle className="text-lg">Agenda operativa</CardTitle>
              <CardDescription>Base propia de Opturon para seguimientos, notas y turnos.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-sm leading-6 text-muted">
            No depende de Google Calendar. Esta capa queda lista para crecer desde el dashboard y conectarse luego con conversaciones.
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">{seguimientoCount} activos</Badge>}>
            <div>
              <CardTitle className="text-lg">Seguimientos del mes</CardTitle>
              <CardDescription>Items comerciales que piden proximo paso o recontacto.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-sm leading-6 text-muted">
            {turnoCount} bloques o turnos y {pendingCount} notas o tareas de soporte a la operacion.
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="outline">Futuro bot</Badge>}>
            <div>
              <CardTitle className="text-lg">Disponibilidad</CardTitle>
              <CardDescription>Base visual para reservar espacios sin cerrar puertas de producto.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 pt-0 text-sm text-muted">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-200">Disponible: 09:00 a 12:00</div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-200">Reserva interna: 16:00 a 17:00</div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 px-3 py-2">Bloqueable luego por bot, operador o regla.</div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader
            action={
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => handleMonthShift(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => handleMonthShift(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            <div>
              <CardTitle className="text-xl">
                {monthLabels[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </CardTitle>
              <CardDescription>Vista mensual para ordenar disponibilidad, turnos y seguimiento diario.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
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
                <CardDescription>Panel diario para operar notas, tareas, seguimientos y turnos.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {selectedItems.length ? (
                selectedItems.map((item) => {
                  const meta = kindMeta(item.kind);
                  return (
                    <div key={item.id} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                            <Badge variant="outline">{item.timeLabel}</Badge>
                            {item.contact ? <Badge variant="muted">{item.contact}</Badge> : null}
                          </div>
                        </div>
                      </div>
                      {item.note ? <p className="mt-3 text-sm leading-6 text-muted">{item.note}</p> : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-bg/35 p-4 text-sm leading-6 text-muted">
                  Todavia no hay items para este dia. Puedes dejar una nota, un seguimiento o reservar un bloque operativo.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="warning">Base inicial</Badge>}>
              <div>
                <CardTitle className="text-xl">Crear item del dia</CardTitle>
                <CardDescription>Primer paso simple para cargar operacion diaria dentro de Opturon.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Titulo</span>
                <Input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ej. Llamar al cliente despues de la propuesta"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Tipo</span>
                  <select
                    value={draft.kind}
                    onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as AgendaItemKind }))}
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="nota">Nota interna</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="tarea">Tarea</option>
                    <option value="turno">Turno o bloqueo</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium">Hora o franja</span>
                  <Input
                    value={draft.timeLabel}
                    onChange={(event) => setDraft((current) => ({ ...current, timeLabel: event.target.value }))}
                    placeholder="Ej. 15:30 o 09:00-10:00"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Contacto o cliente</span>
                <Input
                  value={draft.contact}
                  onChange={(event) => setDraft((current) => ({ ...current, contact: event.target.value }))}
                  placeholder="Ej. Farmacia Centro"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Nota</span>
                <Textarea
                  value={draft.note}
                  onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Contexto, pendiente o instruccion interna para este item."
                  className="min-h-28"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <Button className="rounded-2xl" onClick={handleCreateItem} disabled={!draft.title.trim()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear item
                </Button>
                <div className="inline-flex items-center rounded-2xl border border-[color:var(--border)] bg-surface/65 px-4 py-2 text-sm text-muted">
                  Se guarda solo en la sesion actual. La persistencia puede llegar despues sin cambiar la UX base.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="outline">Preparado</Badge>}>
              <div>
                <CardTitle className="text-xl">Direccion de producto</CardTitle>
                <CardDescription>Lo que esta base deja listo para evolucionar sin rehacer el modulo.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              {[
                { icon: NotebookPen, title: "Notas y contexto", detail: "Cada dia puede concentrar comentarios internos y proximos pasos." },
                { icon: UserRound, title: "Asociacion a contacto", detail: "La estructura ya contempla vincular seguimiento comercial con clientes." },
                { icon: Clock3, title: "Disponibilidad y turnos", detail: "La vista mensual y el panel diario ya soportan reservar o bloquear franjas." },
                { icon: CalendarDays, title: "Futuro bot", detail: "Luego puede consultar disponibilidad, sugerir horarios y crear reservas desde conversaciones." }
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
