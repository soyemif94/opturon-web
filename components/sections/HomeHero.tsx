import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

const certaintyBullets = [
  "Respuesta en el día hábil",
  "Auditoría estratégica inicial (15 min)",
  "Sin compromiso"
];

export function HomeHero() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "hero" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <Section className="overflow-hidden pt-20 md:pt-28">
      <div className="absolute inset-0 -z-10 opacity-80">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute right-0 top-6 h-80 w-80 rounded-full bg-brandDeep/20 blur-3xl" />
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brandBright">
            <Sparkles className="h-3.5 w-3.5" />
            Opturon AI Systems
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-tight md:text-6xl">
            Automatizamos WhatsApp para equipos comerciales que quieren vender más sin aumentar carga operativa
          </h1>
          <p className="max-w-3xl text-lg text-muted md:text-xl">
            Diseñamos e implementamos sistemas inteligentes con IA e integración CRM para que cada conversación tenga
            seguimiento, contexto y próximos pasos claros.
          </p>

          <div className="rounded-2xl border border-brand/30 bg-brand/10 p-4 text-sm text-text/90">
            Ideal para empresas con equipo comercial y volumen constante de consultas (50+ por mes). Si estás por
            debajo, escribinos igual: te decimos si tiene sentido automatizar ahora.
          </div>

          <p className="text-sm text-muted">
            Implementación en semanas. Optimización continua basada en métricas reales.
          </p>

          <div className="flex flex-wrap gap-3">
            <WhatsAppCtaLink
              href={whatsAppLink}
              origin="hero"
              ariaLabel="Hablar por WhatsApp con Opturon desde hero"
              isExternal={isExternalWhatsApp}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brandBright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Hablar por WhatsApp
            </WhatsAppCtaLink>
            <SecondaryButton href="#solucion" ariaLabel="Ver como funciona y navegar a la sección solución">
              Ver el sistema (2 min)
              <ArrowRight className="ml-2 h-4 w-4" />
            </SecondaryButton>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            {certaintyBullets.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brandBright" />
                {item}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted">
            Te respondemos en el día hábil (lun-vie). Auditoría estratégica inicial (15 min) por WhatsApp.
          </p>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-brand/30 bg-brand-linear p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatBox label="Conversaciones con seguimiento" value="100% trazables" />
              <StatBox label="Integración comercial" value="WhatsApp + CRM" />
              <StatBox label="Ventana de implementación" value="Semanas" />
              <StatBox label="Iteración" value="Continua con métricas" />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-bg/50 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-text">{value}</p>
    </div>
  );
}