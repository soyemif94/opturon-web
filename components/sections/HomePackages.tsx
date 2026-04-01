import { ArrowRight, MessageCircle } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { getCardGlowClass } from "@/components/ui/card";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

const stages = [
  {
    name: "Ordenar el ingreso",
    description: "Para negocios que ya reciben consultas, pero todavia trabajan cada chat por separado y sin criterio comun.",
    bullets: ["Inbox centralizado", "Contactos con contexto", "Primer seguimiento visible"],
    featured: false
  },
  {
    name: "Activar el seguimiento",
    description: "Para equipos que ya venden por WhatsApp, pero necesitan priorizar mejor, responder a tiempo y mover oportunidades con ritmo.",
    bullets: ["Pipeline comercial claro", "Tareas y recordatorios", "Seguimiento automatizado"],
    featured: true
  },
  {
    name: "Escalar sin perder control",
    description: "Para operaciones que ya tienen volumen y necesitan mas visibilidad, mas trazabilidad y menos dependencia de memoria humana.",
    bullets: ["Mas usuarios y conversaciones", "Mas control del flujo comercial", "Mas trazabilidad operativa"],
    featured: false
  }
];

export function HomePackages() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "home-plans" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <Section id="planes">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Etapas de implementación</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
          Ubica rápido qué nivel de sistema necesita hoy tu negocio
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
          No se trata de elegir un plan bonito. Se trata de entender en qué punto está hoy tu operación comercial y
          cuál es el siguiente nivel de orden que te conviene implementar.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {stages.map((stage) => (
          <article
            key={stage.name}
            className={`rounded-[2rem] border p-7 ${getCardGlowClass("orange")} ${
              stage.featured
                ? "border-brand/40 bg-[linear-gradient(180deg,rgba(176,80,0,0.16),rgba(31,31,31,0.96))]"
                : "border-[color:var(--border)] bg-card/90"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">{stage.name}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{stage.description}</p>
              </div>
              {stage.featured ? (
                <span className="rounded-full border border-brand/40 bg-brand/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brandBright">
                  Etapa más común
                </span>
              ) : null}
            </div>

            <div className="mt-8 grid gap-3">
              {stage.bullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-text">
                  {bullet}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <PrimaryButton href="#producto" ariaLabel="Ver el sistema funcionando en 2 minutos">
          Ver el sistema funcionando (2 min)
          <ArrowRight className="ml-2 h-4 w-4" />
        </PrimaryButton>
        <WhatsAppCtaLink
          href={whatsAppLink}
          origin="home-plans"
          ariaLabel="Hablar por WhatsApp sobre la etapa ideal"
          isExternal={isExternalWhatsApp}
          className="whatsapp-accent-hover inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <MessageCircle className="whatsapp-accent-icon mr-2 h-4 w-4" />
          Quiero ubicar mi etapa
        </WhatsAppCtaLink>
      </div>

      <p className="mt-4 text-xs text-muted">
        Primero ubicamos la etapa correcta. Después definimos la configuración que mejor encaja con tu operación.
      </p>
    </Section>
  );
}
