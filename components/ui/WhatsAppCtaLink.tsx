"use client";

import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setSessionEid, trackEvent, trackLeadIntent, trackWhatsAppClick } from "@/lib/analytics";

type WhatsAppCtaLinkProps = {
  href: string;
  origin: "hero" | "cta-final" | "sticky" | string;
  ariaLabel: string;
  className: string;
  isExternal?: boolean;
  postClickRedirectTo?: string;
  openInNewTab?: boolean;
  intentEvent?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

function isLikelyIOSWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iP(hone|ad|od)/i.test(ua);
  if (isIOS) return true;

  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua);
  return isSafari;
}

export function WhatsAppCtaLink({
  href,
  origin,
  ariaLabel,
  className,
  isExternal = false,
  postClickRedirectTo,
  openInNewTab = true,
  intentEvent = true,
  onClick,
  children
}: WhatsAppCtaLinkProps) {
  const router = useRouter();
  const shouldOpenInNewTab = openInNewTab || isExternal;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const event_id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setSessionEid(event_id);

    trackWhatsAppClick(origin, { event_id });
    if (intentEvent) {
      trackLeadIntent(origin, "whatsapp", { event_id });
    }
    onClick?.();

    const forceSameTab = isLikelyIOSWebKit();
    if (shouldOpenInNewTab && forceSameTab) {
      trackEvent("whatsapp_opened", {
        origin,
        path: window.location.pathname,
        mode: "same_tab_fallback",
        reason: "ios_safari_forced"
      });
      window.location.href = href;
      return;
    }

    if (!shouldOpenInNewTab) {
      return;
    }

    event.preventDefault();
    const popup = window.open(href, "_blank", "noopener,noreferrer");
    if (popup) {
      trackEvent("whatsapp_opened", {
        origin,
        path: window.location.pathname,
        mode: "new_tab"
      });

      let returnFired = false;

      const onVisibilityChange = () => {
        if (document.visibilityState !== "visible") return;
        if (returnFired) return;

        returnFired = true;

        trackEvent("whatsapp_return", {
          origin,
          path: window.location.pathname,
          event_id
        });

        document.removeEventListener("visibilitychange", onVisibilityChange);
      };

      document.addEventListener("visibilitychange", onVisibilityChange);

      window.setTimeout(() => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }, 30000);

      if (postClickRedirectTo) {
        const currentSearch = window.location.search || "";
        const nextUrlBase = `${postClickRedirectTo}${currentSearch}`;
        const hasEidAlready = /(?:\?|&)eid=/.test(nextUrlBase);
        const separator = nextUrlBase.includes("?") ? "&" : "?";
        const nextUrl = hasEidAlready
          ? nextUrlBase
          : `${nextUrlBase}${separator}eid=${encodeURIComponent(event_id)}`;
        router.push(nextUrl);
      }
      return;
    }

    trackEvent("whatsapp_opened", {
      origin,
      path: window.location.pathname,
      mode: "same_tab_fallback"
    });
    window.location.href = href;
  }

  return (
    <a
      href={href}
      aria-label={ariaLabel}
      target={shouldOpenInNewTab ? "_blank" : undefined}
      rel={shouldOpenInNewTab ? "noopener noreferrer" : undefined}
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
