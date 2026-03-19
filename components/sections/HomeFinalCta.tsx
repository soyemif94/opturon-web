import { ArrowRight, MessageCircle } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
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
          <PrimaryButton href="#producto" ariaLabel="Ver el sistema funcionando en 2 minutos">
            Ver el sistema funcionando (2 min)
            <ArrowRight className="ml-2 h-4 w-4" />
          </PrimaryButton>
          <WhatsAppCtaLink
            href={whatsAppLink}
            origin="cta-final"
            ariaLabel="Hablar por WhatsApp con Opturon"
            isExternal={isExternalWhatsApp}
            className="whatsapp-accent-hover inline-flex h-11 items-center justify-center rounded-xl border border-brand/40 bg-transparent px-5 text-sm font-semibold text-text hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <MessageCircle className="whatsapp-accent-icon mr-2 h-4 w-4" />
            Quiero ver esto en mi negocio
          </WhatsAppCtaLink>
        </div>
        <p className="mt-4 text-sm text-muted">Primero lo ves funcionando. Despues vemos si encaja con tu operacion.</p>
      </div>
    </Section>
  );
}
