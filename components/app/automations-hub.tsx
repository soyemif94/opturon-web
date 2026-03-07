"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  MessageSquareText,
  MoonStar,
  PhoneCall,
  Sparkles,
  UserRound,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AutomationState = "activa" | "inactiva" | "requiere configuracion" | "recomendada";

type Module = {
  id: string;
  name: string;
  description: string;
  state: AutomationState;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
};

const initialModules: Module[] = [
  {
    id: "welcome",
    name: "Bienvenida",
    description: "Recibe al contacto y encuadra el inicio de la conversacion.",
    state: "activa",
    summary: "Saludo inicial activo con mensaje de marca y primer filtro de intencion.",
    icon: Sparkles
  },
  {
    id: "off-hours",
    name: "Fuera de horario",
    description: "Responde automaticamente cuando el negocio no esta atendiendo.",
    state: "activa",
    summary: "Hoy informa horario y promete seguimiento del equipo al proximo bloque operativo.",
    icon: MoonStar
  },
  {
    id: "handoff",
    name: "Derivacion a humano",
    description: "Escala conversaciones al equipo cuando hace falta intervencion.",
    state: "recomendada",
    summary: "Ideal para urgencias, leads calientes o consultas sensibles.",
    icon: UserRound
  },
  {
    id: "faq",
    name: "Preguntas frecuentes",
    description: "Resuelve dudas repetidas para bajar carga manual.",
    state: "activa",
    summary: "Preparada para horarios, precios base, zonas y respuestas cortas.",
    icon: MessageSquareText
  },
  {
    id: "lead-capture",
    name: "Captura de leads",
    description: "Pide datos basicos y ordena el primer contacto comercial.",
    state: "requiere configuracion",
    summary: "Falta definir que datos del lead queres capturar primero.",
    icon: PhoneCall
  },
  {
    id: "appointments",
    name: "Agenda / turnos",
    description: "Guia reservas, confirmaciones o derivacion a agenda.",
    state: "recomendada",
    summary: "Pensada para clinicas, demos, reuniones y turnos comerciales.",
    icon: CalendarDays
  },
  {
    id: "reminders",
    name: "Recordatorios",
    description: "Recupera conversaciones y evita que los leads se enfrien.",
    state: "inactiva",
    summary: "Todavia no se estan enviando recordatorios automaticos a contactos sin respuesta.",
    icon: AlarmClock
  },
  {
    id: "quick-replies",
    name: "Respuestas rapidas",
    description: "Sugerencias cortas para acelerar atencion y mantener consistencia.",
    state: "activa",
    summary: "Disponibles para soporte, ventas y handoff a humano desde el inbox.",
    icon: Bot
  }
];

export function AutomationsHub() {
  const [modules, setModules] = useState(initialModules);

  const stats = useMemo(() => {
    const active = modules.filter((item) => item.state === "activa").length;
    const pending = modules.filter((item) => item.state === "requiere configuracion").length;
    const recommended = modules.filter((item) => item.state === "recomendada").length;
    return { active, pending, recommended };
  }, [modules]);

  function cycleState(id: string) {
    setModules((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextState =
          item.state === "activa"
            ? "inactiva"
            : item.state === "inactiva"
              ? "requiere configuracion"
              : item.state === "requiere configuracion"
                ? "recomendada"
                : "activa";
        return { ...item, state: nextState };
      })
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden border-white/6 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
          <CardHeader action={<Badge variant="warning">Centro de automatizacion</Badge>}>
            <div>
              <CardTitle className="text-2xl">Automatiza partes clave de tu atencion sin volverte tecnico</CardTitle>
              <CardDescription>
                Desde aca el cliente puede entender que hace el bot hoy, que esta pendiente y que modulos conviene activar despues.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <p className="max-w-3xl text-sm leading-7 text-muted">
              Las automatizaciones de Opturon ordenan saludos, preguntas frecuentes, handoff humano, captura de leads y seguimientos sin que el negocio tenga que configurar flujos complejos.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl px-5">Revisar modulos activos</Button>
              <Button variant="secondary" className="rounded-2xl px-5">
                Ver recomendaciones
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Resumen</Badge>}>
            <div>
              <CardTitle className="text-xl">Estado general</CardTitle>
              <CardDescription>Indicadores rapidos para que el cliente entienda que ya esta funcionando.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            <StatBlock label="Automatizaciones activas" value={String(stats.active)} />
            <StatBlock label="Pendientes de configuracion" value={String(stats.pending)} />
            <StatBlock label="Recomendadas" value={String(stats.recommended)} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.id} className="border-white/6 bg-card/90">
              <CardHeader action={<Badge variant={stateVariant(module.state)}>{module.state}</Badge>}>
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
                    <Icon className="h-5 w-5 text-brandBright" />
                  </span>
                  <div>
                    <CardTitle className="text-xl">{module.name}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                  {module.summary}
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-bg/70 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Estado visual</p>
                    <p className="mt-1 text-sm font-medium capitalize">{module.state}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cycleState(module.id)}
                    className="inline-flex h-7 w-12 items-center rounded-full border border-[color:var(--border)] bg-card p-1"
                    aria-label={`Cambiar estado de ${module.name}`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full transition-transform ${
                        module.state === "activa"
                          ? "translate-x-5 bg-emerald-400"
                          : module.state === "recomendada"
                            ? "translate-x-3 bg-amber-400"
                            : module.state === "requiere configuracion"
                              ? "translate-x-1 bg-brandBright"
                              : "translate-x-0 bg-muted"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 rounded-2xl">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="ghost" className="rounded-2xl px-4">
                    <Zap className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="outline">Como se ve para el cliente</Badge>}>
            <div>
              <CardTitle className="text-xl">Que resuelve este centro</CardTitle>
              <CardDescription>Explicacion simple de valor para demos y para usuarios no tecnicos.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
            {[
              "Explica que partes del primer contacto ya estan automatizadas.",
              "Muestra que modulos estan activos y cuales faltan configurar.",
              "Prepara el terreno para enchufar backend real sin rehacer la UI.",
              "Hace mas clara la propuesta comercial de Opturon para dueños de negocio."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Siguiente paso</Badge>}>
            <div>
              <CardTitle className="text-xl">Accion rapida recomendada</CardTitle>
              <CardDescription>Orientacion comercial para que el cliente sepa por donde seguir.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              { icon: CheckCircle2, text: "Revisar bienvenidas y FAQs activas" },
              { icon: Clock3, text: "Definir fuera de horario y recordatorios" },
              { icon: UserRound, text: "Configurar handoff a humano para casos sensibles" }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Icon className="h-4 w-4 text-brandBright" />
                    </span>
                    <p className="text-sm leading-6 text-muted">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function stateVariant(state: AutomationState): "success" | "muted" | "warning" {
  if (state === "activa") return "success";
  if (state === "inactiva") return "muted";
  return "warning";
}
