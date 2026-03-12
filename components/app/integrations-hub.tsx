"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Instagram,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  PlugZap,
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

type WhatsAppIntegrationStatus = {
  state: IntegrationState;
  connectedNumber: string | null;
  channelStatus: string | null;
  webhookActive: boolean | null;
  lastActivity: string | null;
};

const integrations: IntegrationCard[] = [
  {
    id: "instagram",
    name: "Instagram",
    description: "Centraliza mensajes directos y consultas comerciales en el mismo workspace.",
    state: "connecting",
    availability: "en preparacion",
    cta: "Preparar canal",
    icon: Instagram,
    helper: "Ideal para negocios que atienden consultas por redes y campañas."
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    description: "Unifica conversaciones de Facebook con el resto de tu operación comercial.",
    state: "not_connected",
    availability: "proximamente",
    cta: "Ver roadmap",
    icon: MessageCircle,
    helper: "Pensado para equipos que reciben consultas desde anuncios y redes."
  },
  {
    id: "webchat",
    name: "Webchat",
    description: "Recibe prospectos desde tu sitio web y canalízalos al inbox del equipo.",
    state: "connected",
    availability: "disponible",
    cta: "Gestionar widget",
    icon: Webhook,
    helper: "Muy útil para captar consultas sin depender solo de WhatsApp."
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Coordina turnos, reuniones o seguimientos directamente desde la conversación.",
    state: "not_connected",
    availability: "en preparacion",
    cta: "Explorar integracion",
    icon: CalendarDays,
    helper: "Un paso natural para negocios que coordinan citas o demos."
  },
  {
    id: "crm",
    name: "CRM externo",
    description: "Empuja contactos, etapas y actividad hacia tu CRM comercial actual.",
    state: "error",
    availability: "disponible",
    cta: "Revisar conexion",
    icon: PlugZap,
    helper: "Sincroniza tu pipeline comercial con lo que sucede en el inbox."
  }
];

export function IntegrationsHub({ whatsapp }: { whatsapp: WhatsAppIntegrationStatus }) {
  const whatsappMeta = whatsappStateMeta(whatsapp);
  const readinessItems = [
    {
      label: "Canal WhatsApp",
      value: whatsapp.state === "connected" ? "Conectado" : whatsapp.state === "connecting" ? "En activacion" : "No conectado",
      tone: whatsapp.state === "connected" ? "success" : whatsapp.state === "error" ? "danger" : "warning"
    },
    {
      label: "Webhook",
      value: whatsappMeta.webhookValue,
      tone: whatsapp.webhookActive ? "success" : whatsapp.state === "error" ? "danger" : "warning"
    },
    {
      label: "Numero vinculado",
      value: whatsapp.connectedNumber || "Pendiente",
      tone: whatsapp.connectedNumber ? "muted" : "warning"
    }
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden border-brand/25 bg-[linear-gradient(135deg,rgba(192,80,0,0.20),rgba(24,24,24,0.96))] shadow-[0_18px_60px_rgba(176,80,0,0.16)]">
          <CardHeader action={<Badge variant={whatsappMeta.variant}>{whatsappMeta.label}</Badge>}>
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-brand/30 bg-brand/15 text-brandBright">
                <PhoneCall className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="text-2xl">{whatsappMeta.title}</CardTitle>
                <CardDescription>{whatsappMeta.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Estado del canal</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span
                      className={`inline-flex h-3 w-3 rounded-full ${
                        whatsapp.state === "connected"
                          ? "bg-emerald-400"
                          : whatsapp.state === "error"
                            ? "bg-rose-400"
                            : "bg-amber-300"
                      }`}
                    />
                    <p className="text-lg font-semibold text-white">{whatsappMeta.label}</p>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
                    {whatsapp.state === "connected"
                      ? "Tu canal principal ya esta listo para recibir mensajes reales y operar desde el inbox."
                      : "Esta conexion habilita conversaciones reales, automatizaciones y trabajo operativo desde un solo lugar."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Siguiente paso</p>
                  <p className="mt-2 font-medium">{whatsappMeta.nextStep}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <StatusStat label="Numero del canal" value={whatsapp.connectedNumber || "Aun no conectado"} />
              <StatusStat label="Estado del canal" value={whatsappMeta.channelValue} />
              <StatusStat label="Webhook" value={whatsappMeta.webhookValue} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {readinessItems.map((item) => (
                <div key={item.label} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{item.label}</p>
                    <Badge variant={item.tone}>{item.value}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <p className="max-w-3xl text-sm leading-7 text-muted">{whatsappMeta.helper}</p>

            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl px-5">{whatsappMeta.primaryCta}</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl rounded-[28px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Activar WhatsApp en Opturon</DialogTitle>
                    <DialogDescription className="text-sm leading-7 text-muted">
                      Sigue estos pasos para conectar tu cuenta de Meta, validar el numero correcto y dejar el canal listo para responder desde el inbox.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-3 py-4">
                    {[
                      "1. Inicias sesion en tu cuenta de Meta Business",
                      "2. Seleccionas el numero que quieres operar en Opturon",
                      "3. Validamos canal, webhook y estado de activacion",
                      "4. Empiezas a responder desde el inbox"
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
                    <Button>{whatsappMeta.primaryCta}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button asChild variant="secondary" className="rounded-2xl px-5">
                <a href="/app/inbox">Abrir inbox</a>
              </Button>

              {whatsapp.state === "connected" ? (
                <Button variant="ghost" className="rounded-2xl px-5">
                  Gestionar canal
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Paso a paso</Badge>}>
            <div>
              <CardTitle className="text-xl">Que sucede cuando conectas el canal</CardTitle>
              <CardDescription>Un recorrido simple para entender el valor de la conexion y que esperar en cada etapa.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              { icon: CheckCircle2, title: "Conectas tu cuenta", detail: "Das acceso a tu cuenta de Meta sin configuraciones tecnicas complejas." },
              { icon: MessageSquareText, title: "Seleccionas tu numero", detail: "Eliges el numero que quieres usar para responder desde Opturon." },
              { icon: PlugZap, title: "Activamos el canal", detail: "Comprobamos conexion, webhook y estado operativo del numero." },
              { icon: ArrowRight, title: "Empiezas a responder", detail: "Tu equipo y el bot trabajan desde un mismo inbox." }
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
            <p className="text-sm text-muted">Conexiones disponibles para centralizar atencion, prospectos y agenda desde un solo workspace.</p>
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

function whatsappStateMeta(whatsapp: WhatsAppIntegrationStatus) {
  if (whatsapp.state === "connected") {
    return {
      label: "Conectado",
      variant: "success" as const,
      title: "Tu canal de WhatsApp ya esta activo",
      description: "Tu numero principal ya esta conectado a Opturon y listo para responder desde el inbox.",
      helper: "El canal ya puede recibir mensajes, centralizar conversaciones y operar desde tu workspace.",
      primaryCta: "Canal activo",
      nextStep: "Abre el inbox y valida una conversacion real.",
      channelValue: whatsapp.channelStatus || "Activo",
      webhookValue: whatsapp.webhookActive ? "Activo" : "Pendiente"
    };
  }

  if (whatsapp.state === "connecting") {
    return {
      label: "Conectando",
      variant: "warning" as const,
      title: "Tu canal esta en proceso de activacion",
      description: "La conexion ya fue iniciada. Solo falta completar la activacion del numero para empezar a operar.",
      helper: "Revisa la activacion del numero y completa los pasos pendientes para dejar el canal listo.",
      primaryCta: "Revisar conexion",
      nextStep: "Completa la activacion del numero en Meta y vuelve a revisar el estado.",
      channelValue: whatsapp.channelStatus || "Pendiente",
      webhookValue: "Pendiente"
    };
  }

  if (whatsapp.state === "error") {
    return {
      label: "Requiere revision",
      variant: "danger" as const,
      title: "Necesitamos revisar la conexion del canal",
      description: "Detectamos una inconsistencia en la conexion actual. Puedes revisarla y retomar la activacion.",
      helper: "Este estado suele resolverse revisando el numero conectado y confirmando la configuracion del canal.",
      primaryCta: "Revisar conexion",
      nextStep: "Revisa el numero vinculado y confirma que el canal siga activo.",
      channelValue: whatsapp.channelStatus || "Error",
      webhookValue: whatsapp.webhookActive ? "Parcial" : "Pendiente"
    };
  }

  return {
    label: "No conectado",
    variant: "warning" as const,
    title: "Conecta tu WhatsApp en pocos minutos",
    description: "Activa tu canal principal para empezar a recibir mensajes reales y responder desde Opturon.",
    helper: "Una vez conectado, tu equipo podra ver conversaciones reales, automatizar respuestas y trabajar desde un solo inbox.",
    primaryCta: "Conectar WhatsApp",
    nextStep: "Conecta tu numero principal para empezar a recibir conversaciones reales.",
    channelValue: "Sin conectar",
    webhookValue: "Pendiente"
  };
}

function stateMeta(state: IntegrationState): {
  label: string;
  detail: string;
  variant: "muted" | "warning" | "success" | "danger";
} {
  if (state === "connected") {
    return {
      label: "Conectado",
      detail: "La integracion esta lista para operar y mostrar actividad dentro del workspace.",
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
      detail: "Hay una inconsistencia de acceso o configuracion que conviene revisar antes de operar.",
      variant: "danger"
    };
  }
  return {
    label: "No conectado",
    detail: "Disponible para iniciar la conexion cuando el negocio quiera activarlo.",
    variant: "muted"
  };
}
