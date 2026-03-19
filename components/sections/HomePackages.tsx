import { ArrowRight, MessageCircle } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

const stages = [
  {
    name: "Inicio ordenado",
    description: "Si hoy respondes como puedes y cada chat queda suelto, esta etapa te ayuda a ordenar lo basico sin complicarte.",
    bullets: ["Inbox centralizado", "Clientes ordenados", "Primer seguimiento claro"],
    featured: false
  },
  {
    name: "Seguimiento activo",
    description: "Si ya tienes consultas todos los dias y quieres convertir mas, esta etapa te da pipeline, ritmo y seguimiento.",
    bullets: ["Pipeline visible", "Tareas y recordatorios", "Seguimiento automatico"],
    featured: true
  },
  {
    name: "Operacion en crecimiento",
    description: "Si ya vendes todos los dias y el volumen empezo a desordenarte, esta etapa te da control sin sumar caos.",
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
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">Una etapa para cada momento comercial</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
          La idea no es que elijas una caja. La idea es que te reconozcas rapido en la etapa que hoy necesita mas
          orden para vender mejor.
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
        <PrimaryButton href="#producto" ariaLabel="Ver como funciona Opturon con WhatsApp">
          Ver como funciona
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
          Hablar por WhatsApp
        </WhatsAppCtaLink>
      </div>

      <p className="mt-4 text-xs text-muted">Te mostramos la configuracion que mejor encaja antes de definir el plan final.</p>
    </Section>
  );
}
