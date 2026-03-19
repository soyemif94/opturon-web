import { ArrowRight, MessageCircle } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

const stages = [
  {
    name: "Inicio ordenado",
    description: "Para negocios que ya reciben consultas por WhatsApp y necesitan dejar de responder a ciegas.",
    bullets: ["Inbox centralizado", "Clientes ordenados", "Primer seguimiento claro"],
    featured: false
  },
  {
    name: "Seguimiento activo",
    description: "Para equipos que quieren mover cada contacto con pipeline y automatizaciones simples.",
    bullets: ["Pipeline visible", "Tareas y recordatorios", "Seguimiento automatico"],
    featured: true
  },
  {
    name: "Operacion en crecimiento",
    description: "Para equipos que ya venden todos los dias y necesitan mas control operativo sin sumar caos.",
    bullets: ["Mas usuarios", "Mas volumen de conversaciones", "Mas control del flujo comercial"],
    featured: false
  }
];

export function HomePackages() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "home-plans" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <Section id="planes">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Planes</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">Planes para cada etapa de venta</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
          Opturon se configura segun tu operacion, tu volumen y el nivel de seguimiento que hoy necesita tu equipo.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {stages.map((stage) => (
          <article
            key={stage.name}
            className={`rounded-[2rem] border p-7 ${
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
                  Recomendado
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
        <PrimaryButton href="#producto" ariaLabel="Ver demo visual del producto">
          Ver demo
          <ArrowRight className="ml-2 h-4 w-4" />
        </PrimaryButton>
        <WhatsAppCtaLink
          href={whatsAppLink}
          origin="home-plans"
          ariaLabel="Consultar plan por WhatsApp"
          isExternal={isExternalWhatsApp}
          className="whatsapp-accent-hover inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <MessageCircle className="whatsapp-accent-icon mr-2 h-4 w-4" />
          Consultar plan
        </WhatsAppCtaLink>
      </div>

      <p className="mt-4 text-xs text-muted">Te mostramos la configuracion que mejor encaja antes de definir el plan final.</p>
    </Section>
  );
}
