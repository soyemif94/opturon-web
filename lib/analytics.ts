"use client";

type EventParams = Record<string, any>;

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID?.trim() || "";
const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || "G-FL6RVZW90M";
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
const EID_STORAGE_KEY = "opturon:eid";
const EID_TTL_MS = 15 * 60 * 1000;
const FUNNEL_EVENTS_WITH_AUTO_EID = new Set([
  "whatsapp_click",
  "lead_intent",
  "whatsapp_return",
  "thank_you_engaged"
]);

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function shouldSendOnce(key: string): boolean {
  if (!isBrowser()) return true;
  try {
    const k = `evt:${key}`;
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, "1");
    return true;
  } catch {
    return true;
  }
}

export function setSessionEid(eid: string): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(EID_STORAGE_KEY, JSON.stringify({ eid, ts: Date.now() }));
  } catch {}
}

export function getSessionEid(): string | undefined {
  if (!isBrowser()) return undefined;
  try {
    const raw = sessionStorage.getItem(EID_STORAGE_KEY);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as { eid?: string; ts?: number };
    if (!parsed?.eid || !parsed?.ts) return undefined;

    if (Date.now() - parsed.ts > EID_TTL_MS) {
      sessionStorage.removeItem(EID_STORAGE_KEY);
      return undefined;
    }

    return parsed.eid;
  } catch {
    return undefined;
  }
}

export function clearSessionEid(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(EID_STORAGE_KEY);
  } catch {}
}

export function hasGA(): boolean {
  return Boolean(GA4_MEASUREMENT_ID || GA4_ID) && isBrowser() && typeof window.gtag === "function";
}

export function hasPixel(): boolean {
  return Boolean(META_PIXEL_ID) && isBrowser() && typeof window.fbq === "function";
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (!params.event_id && FUNNEL_EVENTS_WITH_AUTO_EID.has(name)) {
    const eid = getSessionEid();
    if (eid) {
      params = { ...params, event_id: eid };
    }
  }

  const eventId = params?.event_id;
  if (eventId && !shouldSendOnce(`${name}:${eventId}`)) return;

  if (!isBrowser()) return;
  if (!GA4_MEASUREMENT_ID && !GA4_ID && !META_PIXEL_ID) return;

  if (isBrowser() && typeof window.gtag === "function") {
    try {
      window.gtag("event", name, params);
    } catch {}
  }

  if (hasPixel()) {
    window.fbq?.("trackCustom", name, params);
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("[event]", name, params);
  }
}

export function trackWhatsAppClick(origin: string, extra: EventParams = {}): void {
  trackEvent("whatsapp_click", { origin, ...extra });
}

export function trackLeadIntent(
  origin: string,
  channel: "whatsapp" | "form" | "email" = "whatsapp",
  extra: EventParams = {}
): void {
  const path = isBrowser() ? window.location.pathname : undefined;
  trackEvent("lead_intent", { origin, channel, path, ...extra });
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
