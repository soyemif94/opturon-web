"use client";

import { trackEvent } from "@/lib/analytics";
import { WhatsAppCtaLink } from "@/components/ui/WhatsAppCtaLink";

type Props = {
  href: string;
  isExternal?: boolean;
  className?: string;
};

export function ThankYouWhatsAppRetryCta({ href, isExternal, className }: Props) {
  return (
    <WhatsAppCtaLink
      href={href}
      origin="thank-you"
      ariaLabel="Abrir WhatsApp de nuevo"
      isExternal={isExternal}
      onClick={() => {
        if (typeof window === "undefined") return;
        trackEvent("thank_you_whatsapp_retry", {
          origin: "thank-you",
          path: window.location.pathname
        });
      }}
      className={className || ""}
    >
      Abrir WhatsApp de nuevo
    </WhatsAppCtaLink>
  );
}

