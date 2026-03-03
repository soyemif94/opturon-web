import { MessageCircle } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export function HomeFinalCta() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "cta-final" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <Section className="pb-24 md:pb-28">
      <div className="relative overflow-hidden rounded-3xl border border-brand/40 bg-card p-8 md:p-14">
        <div className="absolute inset-0 -z-10 bg-brand-radial opacity-70" />
        <h2 className="max-w-3xl text-balance text-3xl font-semibold md:text-5xl">
          Si hoy dependés de WhatsApp para vender, necesitás un sistema.
        </h2>
        <div className="mt-8 flex flex-wrap gap-3">
          <WhatsAppCtaLink
            href={whatsAppLink}
            origin="cta-final"
            ariaLabel="Hablar por WhatsApp ahora con Opturon"
            isExternal={isExternalWhatsApp}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brandBright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Hablar por WhatsApp ahora
          </WhatsAppCtaLink>
        </div>
        <p className="mt-4 text-xs text-muted">
          Auditoría estratégica inicial (15 min) · Sin compromiso · Respuesta en el día hábil
        </p>
      </div>
    </Section>
  );
}