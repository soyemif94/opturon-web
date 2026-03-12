"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock3, UserRound } from "lucide-react";
import { AutomationsEmptyState } from "@/components/app/automations-empty-state";
import { AutomationsList, type AutomationModule } from "@/components/app/automations-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules: AutomationModule[] = [
  {
    id: "welcome",
    name: "Bienvenida",
    description: "Recibe al contacto y encuadra el inicio de la conversacion.",
    state: "activa",
    summary: "Saludo inicial activo con mensaje de marca y primer filtro de intencion.",
    trigger: "Cuando llega el primer mensaje",
    action: "Enviar bienvenida y ordenar la intencion",
    icon: "sparkles"
  },
  {
    id: "off-hours",
    name: "Fuera de horario",
    description: "Responde automaticamente cuando el negocio no esta atendiendo.",
    state: "activa",
    summary: "Hoy informa horario y promete seguimiento del equipo al proximo bloque operativo.",
    trigger: "Mensaje recibido fuera de horario",
    action: "Informar horario y prometer seguimiento",
    icon: "moon"
  },
  {
    id: "handoff",
    name: "Derivacion a humano",
    description: "Escala conversaciones al equipo cuando hace falta intervencion.",
    state: "recomendada",
    summary: "Ideal para urgencias, prospectos calientes o consultas sensibles.",
    trigger: "Conversacion sensible o prospecto caliente",
    action: "Derivar al equipo humano",
    icon: "human"
  },
  {
    id: "faq",
    name: "Preguntas frecuentes",
    description: "Resuelve dudas repetidas para bajar carga manual.",
    state: "activa",
    summary: "Preparada para horarios, precios base, zonas y respuestas cortas.",
    trigger: "Consultas repetidas del cliente",
    action: "Responder FAQ automaticamente",
    icon: "faq"
  },
  {
    id: "lead-capture",
    name: "Captura de prospectos",
    description: "Pide datos basicos y ordena el primer contacto comercial.",
    state: "requiere configuracion",
    summary: "Falta definir que datos del prospecto quieres capturar primero.",
    trigger: "Primer contacto comercial",
    action: "Pedir datos clave del prospecto",
    icon: "phone"
  },
  {
    id: "appointments",
    name: "Agenda / turnos",
    description: "Guia reservas, confirmaciones o derivacion a agenda.",
    state: "recomendada",
    summary: "Pensada para clinicas, demos, reuniones y turnos comerciales.",
    trigger: "Consulta sobre turnos o reuniones",
    action: "Guiar reserva o derivar a agenda",
    icon: "calendar"
  },
  {
    id: "reminders",
    name: "Recordatorios",
    description: "Recupera conversaciones y evita que los prospectos se enfrien.",
    state: "inactiva",
    summary: "Todavia no se estan enviando recordatorios automaticos a contactos sin respuesta.",
    trigger: "Prospecto sin respuesta o seguimiento pendiente",
    action: "Enviar recordatorio automatico",
    icon: "alarm"
  },
  {
    id: "quick-replies",
    name: "Respuestas rapidas",
    description: "Sugerencias cortas para acelerar atencion y mantener consistencia.",
    state: "activa",
    summary: "Disponibles para soporte, ventas y handoff a humano desde el inbox.",
    trigger: "Respuesta frecuente del equipo",
    action: "Sugerir respuestas listas para usar",
    icon: "bot"
  }
];

export function AutomationsHub() {
  const stats = useMemo(() => {
    const active = modules.filter((item) => item.state === "activa").length;
    const pending = modules.filter((item) => item.state === "requiere configuracion").length;
    const recommended = modules.filter((item) => item.state === "recomendada").length;
    return { active, pending, recommended };
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden border-white/6 bg-[linear-gradient(135deg,rgba(192,80,0,0.18),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
          <CardHeader action={<Badge variant="warning">Centro de automatizacion</Badge>}>
            <div>
              <CardTitle className="text-2xl">Automatiza respuestas y acciones cuando llegan mensajes de WhatsApp</CardTitle>
              <CardDescription>
                Revisa que automatizaciones ya estan activas, cuales conviene preparar y como ayudarte a responder mas rapido sin sumar complejidad.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <p className="max-w-3xl text-sm leading-7 text-muted">
              Las automatizaciones de Opturon te ayudan a responder fuera de horario, calificar prospectos automaticamente e iniciar flujos de conversacion sin depender de configuraciones tecnicas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl px-5">Crear primera automatizacion</Button>
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
              <CardDescription>Indicadores simples para entender que ya esta automatizado y que falta activar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0">
            <StatBlock label="Automatizaciones activas" value={String(stats.active)} />
            <StatBlock label="Pendientes de configuracion" value={String(stats.pending)} />
            <StatBlock label="Recomendadas" value={String(stats.recommended)} />
          </CardContent>
        </Card>
      </section>

      {modules.length > 0 ? <AutomationsList modules={modules} /> : <AutomationsEmptyState />}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="outline">Como ayuda al negocio</Badge>}>
            <div>
              <CardTitle className="text-xl">Que resuelve este modulo</CardTitle>
              <CardDescription>Explicacion simple para que un negocio entienda rapidamente el valor de automatizar.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
            {[
              "Explica que partes del primer contacto ya estan automatizadas.",
              "Muestra que modulos estan activos y cuales faltan configurar.",
              "Ayuda a responder mas rapido sin sumar trabajo manual.",
              "Hace mas clara la propuesta comercial de Opturon para duenos de negocio."
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
              <CardDescription>Orientacion clara para saber por donde seguir.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              { icon: CheckCircle2, text: "Revisar bienvenidas y preguntas frecuentes activas" },
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
