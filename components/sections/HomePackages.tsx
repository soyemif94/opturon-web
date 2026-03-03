import { MessageCircle } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

const packages = [
  {
    title: "WhatsApp Starter",
    bullets: ["Flujos y respuestas base", "Derivación y etiquetas", "Setup inicial"],
    cta: "Quiero Starter",
    origin: "package-starter",
    recommended: false
  },
  {
    title: "Sales System",
    bullets: ["Calificación + seguimiento", "Integración CRM", "Métricas y eventos"],
    cta: "Quiero Sales System",
    origin: "package-sales",
    recommended: true
  },
  {
    title: "Ops & Scale",
    bullets: ["Automatizaciones internas", "Optimización mensual", "Reporting y mejoras"],
    cta: "Quiero Ops & Scale",
    origin: "package-scale",
    recommended: false
  }
] as const;

export function HomePackages() {
  return (
    <Section id="home-packages">
      <div className="mb-8 max-w-4xl">
        <h2 className="text-3xl font-semibold md:text-4xl">Formas de implementación</h2>
        <p className="mt-3 text-muted">
          Elegí el nivel según tu volumen y objetivos. Te recomendamos la opción ideal en la auditoría estratégica
          inicial (15 min).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {packages.map((item) => {
          const link = getTrackedWhatsAppLink({ origin: item.origin });
          const isExternal = isWhatsAppExternalLink(link);

          return (
            <GlowCard key={item.title} className="relative">
              {item.recommended ? (
                <span className="absolute right-4 top-4 rounded-full border border-brand/40 bg-brand/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brandBright">
                  Recomendado
                </span>
              ) : null}
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brandBright" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <WhatsAppCtaLink
                href={link}
                origin={item.origin}
                ariaLabel={`${item.cta} por WhatsApp`}
                isExternal={isExternal}
                className="mt-6 inline-flex h-10 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-4 text-sm font-semibold text-text transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/70 hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {item.cta}
              </WhatsAppCtaLink>
            </GlowCard>
          );
        })}
      </div>
    </Section>
  );
}