import { ArrowRight, ChartNoAxesColumn, MessageCircle, TimerReset, Users } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";
import { HomeProductMockup } from "./HomeProductMockup";

const quickBenefits = [
  "Responde en segundos",
  "No pierdas leads",
  "Seguimiento automatico",
  "Pipeline integrado"
];

const heroStats = [
  { label: "Inbox ordenado", value: "Todo el equipo ve lo mismo", icon: MessageCircle },
  { label: "Seguimiento", value: "Tareas y oportunidades activas", icon: TimerReset },
  { label: "Pipeline", value: "Etapas claras para vender", icon: ChartNoAxesColumn },
  { label: "Clientes", value: "Historial en cada ficha", icon: Users }
];

export function HomeHero() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "hero" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <Section
      className="overflow-x-clip overflow-y-visible pt-16 md:pt-20 lg:flex lg:min-h-[82vh] lg:items-center lg:pt-16"
      containerClassName="relative w-full"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(176,80,0,0.24),transparent_35%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />

      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)] lg:gap-10 xl:gap-14">
        <div className="max-w-2xl space-y-7">
          <div className="whatsapp-accent-badge inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.24em]">
            CRM conversacional para ventas por WhatsApp
          </div>

          <div className="space-y-4">
            <h1 className="text-balance text-4xl font-semibold leading-tight md:text-6xl">
              Converti WhatsApp en tu sistema de ventas
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted md:text-xl">
              Ordena chats, seguimientos y oportunidades en un solo flujo para responder mejor, mover cada contacto y
              cerrar mas ventas desde WhatsApp.
            </p>
            <p className="max-w-xl text-sm font-medium leading-7 text-text/90">
              La mayoria de las ventas no se pierden por falta de consultas, sino por falta de seguimiento.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {quickBenefits.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-text/95"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <PrimaryButton href="#producto" ariaLabel="Ver el sistema funcionando en 2 minutos">
              Ver el sistema funcionando (2 min)
              <ArrowRight className="ml-2 h-4 w-4" />
            </PrimaryButton>
            <WhatsAppCtaLink
              href={whatsAppLink}
              origin="hero"
              ariaLabel="Hablar por WhatsApp con Opturon desde hero"
              isExternal={isExternalWhatsApp}
              className="whatsapp-accent-hover inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <MessageCircle className="whatsapp-accent-icon mr-2 h-4 w-4" />
              Quiero ver esto en mi negocio
            </WhatsAppCtaLink>
          </div>

          <p className="text-sm text-muted">
            En menos de 2 minutos | Sin instalar nada | Pensado para negocios que venden por WhatsApp
          </p>
          <p className="text-sm text-text/85">Si hoy vendes por WhatsApp, esto ya te puede ordenar las ventas.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10">
                    <Icon className="h-4 w-4 text-brandBright" />
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-text">{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto flex min-w-0 w-full max-w-[40rem] items-center justify-center pt-2 md:pt-4 lg:max-w-[36rem] lg:justify-self-end lg:pt-8 xl:max-w-[39rem] 2xl:max-w-[41rem]">
          <div className="absolute -left-10 top-16 hidden h-28 w-28 rounded-full bg-brand/20 blur-3xl md:block" />
          <div className="absolute -right-8 bottom-8 hidden h-32 w-32 rounded-full bg-white/10 blur-3xl md:block" />
          <div className="relative z-10 min-w-0 w-full">
            <HomeProductMockup variant="hero" />
          </div>
        </div>
      </div>
    </Section>
  );
}
