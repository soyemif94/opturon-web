"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Instagram,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  PlugZap,
  TriangleAlert,
  Webhook
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type IntegrationState = "not_connected" | "connecting" | "connected" | "error";

type IntegrationCard = {
  id: string;
  name: string;
  description: string;
  state: IntegrationState;
  availability: "disponible" | "proximamente" | "en preparacion";
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
  helper?: string;
};

const integrations: IntegrationCard[] = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Unifica DMs y consultas de campañas en el mismo workspace del cliente.",
    state: "connecting",
    availability: "en preparacion",
    cta: "Preparar canal",
    icon: Instagram,
    helper: "Ideal para consultas comerciales y mensajes entrantes desde anuncios."
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Centraliza conversaciones de tu pagina y soporte ligero en un solo flujo.",
    state: "not_connected",
    availability: "proximamente",
    cta: "Ver roadmap",
    icon: MessageCircle,
    helper: "Pensado para negocios que operan desde Facebook y WhatsApp."
  },
  {
    id: "webchat",
    name: "Webchat",
    description: "Recibe mensajes desde tu sitio y deriva leads al inbox del equipo.",
    state: "connected",
    availability: "disponible",
    cta: "Gestionar widget",
    icon: Webhook,
    helper: "Muy util para captar consultas sin depender solo de redes sociales."
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Coordina turnos, reuniones o callbacks desde conversaciones activas.",
    state: "not_connected",
    availability: "en preparacion",
    cta: "Explorar integracion",
    icon: CalendarDays,
    helper: "Siguiente paso natural para clinicas, demos y agendas comerciales."
  },
  {
    id: "crm",
    name: "CRM externo",
    description: "Empuja contactos, etapas y actividad hacia tu CRM comercial actual.",
    state: "error",
    availability: "disponible",
    cta: "Revisar conexion",
    icon: PlugZap,
    helper: "Sales handoff, atribucion y seguimiento unificado con tu pipeline."
  }
];

export function IntegrationsHub() {
  const whatsappConnected = false;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden border-brand/25 bg-[linear-gradient(135deg,rgba(192,80,0,0.20),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
          <CardHeader action={<Badge variant={whatsappConnected ? "success" : "warning"}>{whatsappConnected ? "Conectado" : "No conectado"}</Badge>}>
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-brand/30 bg-brand/15 text-brandBright">
                <PhoneCall className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="text-2xl">Conectá tu WhatsApp en 2 minutos</CardTitle>
                <CardDescription>
                  Esta es la integracion principal del portal. Desde aca el cliente conectara su cuenta de Meta y activara su canal.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {whatsappConnected ? (
              <div className="grid gap-3 md:grid-cols-3">
                <StatusStat label="Numero conectado" value="+54 9 291 566 5793" />
                <StatusStat label="Estado del canal" value="Activo" />
                <StatusStat label="Ultima actividad" value="Hace 18 min" />
              </div>
            ) : (
              <p className="max-w-3xl text-sm leading-7 text-muted">
                Una vez conectado el canal, el cliente podra recibir mensajes reales, automatizar respuestas y trabajar el inbox desde Opturon sin configuraciones manuales.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl px-5">Conectar WhatsApp</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-[28px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Embedded Signup de WhatsApp</DialogTitle>
                    <DialogDescription className="text-sm leading-7 text-muted">
                      Este modal representa el punto donde luego se abrira el flujo real de Meta para conectar el canal del cliente.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-3 py-4">
                    {[
                      "1. Conectas tu cuenta de Meta",
                      "2. Elegis tu numero de WhatsApp Business",
                      "3. Activamos tu canal dentro de Opturon",
                      "4. Empezas a responder desde el inbox"
                    ].map((step) => (
                      <div key={step} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm text-muted">
                        {step}
                      </div>
                    ))}
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="secondary">Cerrar</Button>
                    </DialogClose>
                    <Button>Continuar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button asChild variant="secondary" className="rounded-2xl px-5">
                <a href="/app/inbox">Ver inbox demo</a>
              </Button>

              {whatsappConnected ? (
                <Button variant="ghost" className="rounded-2xl px-5">
                  Gestionar canal
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Flujo simple</Badge>}>
            <div>
              <CardTitle className="text-xl">Como funciona</CardTitle>
              <CardDescription>Explicacion corta y comercial del onboarding del canal.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              { icon: CheckCircle2, title: "Conectas tu cuenta de Meta", detail: "Autorizas el acceso sin tocar configuraciones tecnicas." },
              { icon: MessageSquareText, title: "Elegis tu numero", detail: "Seleccionas el numero que queres operar dentro de Opturon." },
              { icon: PlugZap, title: "Activamos el canal", detail: "Validamos canal, estado y visibilidad para dejarlo listo." },
              { icon: ArrowRight, title: "Empezas a responder", detail: "El inbox y las automatizaciones quedan disponibles en el portal." }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
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
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Canales e integraciones</h2>
            <p className="text-sm text-muted">Todo lo que el cliente podra conectar desde el portal.</p>
          </div>
          <Badge variant="muted">Centro de integraciones</Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            const state = stateMeta(integration.state);
            return (
              <Card key={integration.id} className="border-white/6 bg-card/90">
                <CardHeader action={<Badge variant={state.variant}>{state.label}</Badge>}>
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
                      <Icon className="h-5 w-5 text-brandBright" />
                    </span>
                    <div>
                      <CardTitle className="text-xl">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{integration.availability}</Badge>
                    {integration.helper ? <Badge variant="muted">{integration.helper}</Badge> : null}
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                    {state.detail}
                  </div>
                  <Button variant={integration.state === "connected" ? "secondary" : "primary"} className="w-full rounded-2xl">
                    {integration.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function stateMeta(state: IntegrationState): {
  label: string;
  detail: string;
  variant: "muted" | "warning" | "success" | "danger";
} {
  if (state === "connected") {
    return {
      label: "Conectado",
      detail: "La integracion aparece lista para operar y mostrar actividad dentro del workspace.",
      variant: "success"
    };
  }
  if (state === "connecting") {
    return {
      label: "Conectando",
      detail: "La conexion esta en preparacion o a la espera de completar su activacion.",
      variant: "warning"
    };
  }
  if (state === "error") {
    return {
      label: "Error",
      detail: "Hay una inconsistencia de acceso o configuracion que requiere revision antes de operar.",
      variant: "danger"
    };
  }
  return {
    label: "No conectado",
    detail: "Disponible para iniciar onboarding cuando el cliente quiera activarlo.",
    variant: "muted"
  };
}
