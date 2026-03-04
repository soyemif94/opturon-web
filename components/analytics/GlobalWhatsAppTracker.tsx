"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/ga";

const DEDUPE_WINDOW_MS = 800;

function getAbsoluteHref(anchor: HTMLAnchorElement): string | null {
  try {
    return new URL(anchor.getAttribute("href") || anchor.href, window.location.href).toString();
  } catch {
    return null;
  }
}

function isWhatsAppHref(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    return host.includes("wa.me") || host.includes("api.whatsapp.com");
  } catch {
    return false;
  }
}

export default function GlobalWhatsAppTracker() {
  const lastTrackedAt = useRef(0);
  const lastTrackedHref = useRef("");

  useEffect(() => {
    const handler = (event: Event) => {
      const target = event.target as Element | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = getAbsoluteHref(anchor);
      if (!href || !isWhatsAppHref(href)) return;

      const now = Date.now();
      const recentlyTracked = now - lastTrackedAt.current <= DEDUPE_WINDOW_MS;
      if (recentlyTracked && lastTrackedHref.current === href) return;

      lastTrackedAt.current = now;
      lastTrackedHref.current = href;

      const rawOrigin = anchor.dataset.origin || anchor.textContent?.trim() || "unknown";
      const origin = rawOrigin.slice(0, 80) || "unknown";

      track("generate_lead", { method: "whatsapp", origin, link_url: href });
      track("whatsapp_click", { origin, link_url: href });
    };

    document.addEventListener("click", handler, { capture: true });
    return () => {
      document.removeEventListener("click", handler, { capture: true });
    };
  }, []);

  return null;
}
