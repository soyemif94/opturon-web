import { trackWhatsAppClick } from "@/lib/analytics";

export function trackCtaClick(origin: "hero" | "cta-final" | "sticky" | string) {
  trackWhatsAppClick(origin);
}
