import { MessageCircle } from "lucide-react";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export function HomeStickyWhatsAppCta() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "sticky" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand/30 bg-bg/95 p-3 backdrop-blur md:hidden">
      <p className="mb-2 text-center text-[11px] text-muted">Auditoría estratégica inicial (15 min) · Sin compromiso</p>
      <WhatsAppCtaLink
        href={whatsAppLink}
        origin="sticky"
        ariaLabel="Hablar por WhatsApp con Opturon desde CTA sticky"
        isExternal={isExternalWhatsApp}
        className="whatsapp-accent-hover inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <MessageCircle className="whatsapp-accent-icon mr-2 h-4 w-4" />
        Hablar por WhatsApp
      </WhatsAppCtaLink>
    </div>
  );
}
