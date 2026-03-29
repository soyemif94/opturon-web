import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";
import { getTrackedWhatsAppLink, isWhatsAppExternalLink } from "@/lib/whatsapp";

export function HomeStickyWhatsAppCta() {
  const whatsAppLink = getTrackedWhatsAppLink({ origin: "sticky" });
  const isExternalWhatsApp = isWhatsAppExternalLink(whatsAppLink);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand/30 bg-bg/95 p-3 backdrop-blur md:hidden">
      <p className="mb-2 text-center text-[11px] text-muted">Resolver dudas y ver tu caso por WhatsApp | Sin compromiso</p>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/app"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[color:var(--border)] bg-surface/80 px-4 text-sm font-semibold text-text"
        >
          Ingresar al software
        </Link>
        <WhatsAppCtaLink
          href={whatsAppLink}
          origin="sticky"
          ariaLabel="Hablar por WhatsApp con Opturon desde CTA sticky"
          isExternal={isExternalWhatsApp}
          className="whatsapp-accent-hover inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <MessageCircle className="whatsapp-accent-icon mr-2 h-4 w-4" />
          WhatsApp
        </WhatsAppCtaLink>
      </div>
    </div>
  );
}
