import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export function HomeFinalCta() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "cta-final" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <Section className="pb-24 md:pb-28">
      <div className="relative overflow-hidden rounded-[2rem] border border-brand/35 bg-card p-8 md:p-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(176,80,0,0.24),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Cierre</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">Empeza a vender mejor desde hoy</h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Organiza tus conversaciones y no pierdas mas ventas por falta de seguimiento.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <WhatsAppCtaLink
            href={whatsAppLink}
            origin="cta-final"
            ariaLabel="Probar el sistema de Opturon por WhatsApp"
            isExternal={isExternalWhatsApp}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brandBright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Probar el sistema
          </WhatsAppCtaLink>
          <Link
            href="#producto"
            aria-label="Ver el sistema funcionando en 2 minutos"
            className="whatsapp-accent-hover inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Ver el sistema funcionando (2 min)
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">Primero lo ves funcionando. Despues vemos si encaja con tu operacion.</p>
      </div>
    </Section>
  );
}
