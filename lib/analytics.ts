"use client";

type EventParams = Record<string, any>;

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "";
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function hasGA(): boolean {
  return Boolean(GA4_ID) && isBrowser() && typeof window.gtag === "function";
}

export function hasPixel(): boolean {
  return Boolean(META_PIXEL_ID) && isBrowser() && typeof window.fbq === "function";
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (!isBrowser()) return;
  if (!GA4_ID && !META_PIXEL_ID) return;

  if (hasGA()) {
    window.gtag?.("event", name, params);
  }

  if (hasPixel()) {
    window.fbq?.("trackCustom", name, params);
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[event]", name, params);
  }
}

export function trackWhatsAppClick(origin: string): void {
  trackEvent("whatsapp_click", { origin });
}

export function trackScrollDepth(depth: number): void {
  trackEvent("scroll_depth", { depth });
}

export function trackView(section: string): void {
  trackEvent("view_section", { section });
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}
