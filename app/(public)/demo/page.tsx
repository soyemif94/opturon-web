import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  MessageCircle,
  PlayCircle,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { ContactLeadForm } from "@/components/contact/ContactLeadForm";
import { AuditIntake } from "@/components/lead/AuditIntake";
import { HomeProductMockup } from "@/components/sections/HomeProductMockup";
import { Card } from "@/components/ui/card";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Demo comercial | Opturon",
  description:
    "Conoce como Opturon evita que se enfrien leads de WhatsApp y convierte conversaciones en un sistema comercial ordenado."
};

const flowSteps = [
  {
    title: "1. Dejas de depender de chats sueltos",
    description:
      "Cada consulta entra en un inbox ordenado con contexto, prioridad y una primera respuesta clara."
  },
  {
    title: "2. El equipo sabe a quien seguir y cuando",
    description:
      "Cada lead queda con owner, estado comercial y proxima accion para no depender de memoria ni planillas."
  },
  {
    title: "3. El negocio recupera control comercial",
    description:
      "OPS muestra atrasos, carga por vendedor y prioridades para que las oportunidades no se enfrien."
  }
];

const serviceLevels = [
  {
    name: "Starter",
    summary: "Para negocios que reciben consultas, pero todavia atienden WhatsApp de forma improvisada.",
    bullets: ["Inbox centralizado", "Contactos con contexto", "Primer seguimiento visible"],
    highlight: "Ideal para ordenar la base",
    fit: "Si hoy respondes todo manualmente y sin un criterio comun."
  },
  {
    name: "Sales System",
    summary: "Para equipos que ya venden por WhatsApp y necesitan seguimiento comercial serio.",
    bullets: ["Pipeline comercial", "Owners y subcuentas", "OPS con alertas y SLA basico"],
    highlight: "El nivel mas pedido",
    fit: "Si ya hay volumen comercial y el problema es seguimiento, cierres y orden."
  },
  {
    name: "Ops & Scale",
    summary: "Para operaciones con volumen que necesitan trazabilidad, supervision y mas control.",
    bullets: ["Mas usuarios y control por tenant", "Seguimiento operativo", "Base lista para escalar"],
    highlight: "Pensado para equipos con crecimiento",
    fit: "Si ya necesitas supervision, multiusuario y menos dependencia de personas clave."
  }
];

const tangibleOutcomes = [
  "Entiendes rapido como evitar leads frios y conversaciones perdidas.",
  "Ves que nivel de sistema necesita hoy tu operacion.",
  "Puedes avanzar por WhatsApp con contexto o dejar una consulta clara."
];

const conversionPoints = [
  {
    label: "Problema",
    text: "Leads sin seguimiento, respuestas desordenadas y ventas que dependen de memoria humana.",
    icon: Clock3
  },
  {
    label: "Solucion",
    text: "Opturon convierte WhatsApp en un flujo con inbox, pipeline, owners y seguimiento visible.",
    icon: Bot
  },
  {
    label: "Resultado",
    text: "Mas control comercial, menos oportunidades enfriadas y un proceso mas facil de supervisar.",
    icon: Target
  }
];

export default function DemoPage() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "demo-page" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <>
      <Section className="overflow-visible pt-16 md:pt-20">
        <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(176,80,0,0.24),transparent_35%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />

        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/35 bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-brandBright">
              <Sparkles className="h-3.5 w-3.5" />
              Demo comercial de Opturon
            </div>

            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold leading-tight md:text-6xl">
                Mira como Opturon evita que las ventas de WhatsApp se pierdan por desorden
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted md:text-xl">
                Esta demo te muestra, en pocos minutos, como pasar de conversaciones sueltas a un sistema comercial con
                seguimiento, responsables y control operativo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {tangibleOutcomes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-text/95"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="grid gap-3">
              {conversionPoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div
                    key={point.label}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-brand/35 bg-brand/10">
                      <Icon className="h-4 w-4 text-brandBright" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brandBright">{point.label}</p>
                      <p className="mt-1 text-sm leading-7 text-text/90">{point.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <WhatsAppCtaLink
                href={whatsAppLink}
                origin="demo-page"
                postClickRedirectTo="/gracias"
                openInNewTab
                ariaLabel="Abrir demo comercial de Opturon por WhatsApp"
                isExternal={isExternalWhatsApp}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brandBright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Quiero una demo guiada por WhatsApp
              </WhatsAppCtaLink>
              <SecondaryButton href="#demo-flow" ariaLabel="Ver el flujo demo de Opturon">
                <PlayCircle className="mr-2 h-4 w-4" />
                Ver como funciona
              </SecondaryButton>
              <PrimaryButton href="/contacto" ariaLabel="Ir a contacto para hablar con Opturon">
                Quiero hablar con el equipo
                <ArrowRight className="ml-2 h-4 w-4" />
              </PrimaryButton>
            </div>

            <p className="text-sm text-muted">
              Sin humo, sin demo falsa. Lo que ves aqui sale del producto real que ya usa inbox, pipeline, OPS y
              multiusuario.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-16 hidden h-28 w-28 rounded-full bg-brand/20 blur-3xl md:block" />
            <div className="absolute -right-8 bottom-8 hidden h-32 w-32 rounded-full bg-white/10 blur-3xl md:block" />
            <div className="relative z-10">
              <HomeProductMockup variant="hero" />
            </div>
          </div>
        </div>
      </Section>

      <Section id="demo-flow">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Flujo guiado</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
            Asi se entiende el valor de Opturon en tres pasos
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            Primero ves el problema que resuelve. Despues entiendes como trabaja el equipo. Y al final puedes avanzar
            con el siguiente paso comercial.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {flowSteps.map((step) => (
            <Card key={step.title} cardGlow="orange" className="p-7">
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted">{step.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-10 grid gap-5 xl:grid-cols-2">
          <Card className="overflow-hidden p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/35 bg-brand/10">
                <Bot className="h-4 w-4 text-brandBright" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Lo primero que cambia</p>
                <p className="text-sm text-muted">Inbox, prioridad y seguimiento en la misma superficie.</p>
              </div>
            </div>
            <HomeProductMockup variant="inbox" compact />
          </Card>

          <Card className="overflow-hidden p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/35 bg-brand/10">
                <Target className="h-4 w-4 text-brandBright" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Lo que mejora despues</p>
                <p className="text-sm text-muted">El pipeline deja claro que oportunidad mover y cual priorizar.</p>
              </div>
            </div>
            <HomeProductMockup variant="pipeline" compact />
          </Card>
        </div>
      </Section>

      <Section id="planes-demo">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Niveles de servicio</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
            Elige el nivel que mejor encaja con tu momento comercial
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            No todos los negocios necesitan lo mismo. Aqui la idea es que ubiques rapido si necesitas ordenar, vender
            con mas seguimiento o escalar con mas control.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {serviceLevels.map((level) => (
            <Card
              key={level.name}
              cardGlow="orange"
              className={level.name === "Sales System" ? "border-brand/40 bg-brand/5 p-7" : "p-7"}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">{level.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{level.summary}</p>
                  <p className="mt-3 text-sm font-medium text-text/90">{level.fit}</p>
                </div>
                <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brandBright">
                  {level.highlight}
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {level.bullets.map((bullet) => (
                  <div key={bullet} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text">
                    {bullet}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="demo-intake" className="pb-24 md:pb-28">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Avance comercial</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
            Si te hace sentido, deja encaminado el siguiente paso
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
            Puedes abrir WhatsApp con un contexto ya cargado o dejar una consulta para que te respondamos con una
            recomendacion mas clara.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6 md:p-8">
            <AuditIntake />
          </Card>

          <div className="space-y-6">
            <Card className="p-6 md:p-8">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/35 bg-brand/10">
                  <Users className="h-4 w-4 text-brandBright" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Tambien puedes dejar tu consulta</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    Esto sirve para negocios que quieren avanzar, pero antes necesitan ordenar objetivo, rubro y nivel
                    de servicio.
                  </p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted">
                <p className="font-medium text-text">Que pasa despues de este paso</p>
                <div className="mt-3 grid gap-3">
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brandBright" />
                    <span>Revisamos tu contexto comercial y te ubicamos en la etapa correcta.</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brandBright" />
                    <span>Te respondemos con siguientes pasos claros, no con una demo vacia.</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brandBright" />
                    <span>Si encaja, avanzamos con la configuracion que tenga sentido para tu operacion.</span>
                  </div>
                </div>
              </div>
              <Link
                href="/contacto"
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brandBright transition hover:text-brand"
              >
                Prefiero ir a la pagina de contacto completa
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>

            <Card className="p-6 md:p-8">
              <ContactLeadForm />
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
