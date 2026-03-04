"use client";

import { useEffect, useRef } from "react";
import { setSessionEid, trackView, trackEvent } from "@/lib/analytics";

export function ThankYouPageEvents() {
  const engagedFired = useRef(false);

  useEffect(() => {
    // Evento actual
    trackView("thank_you");
    const eid = new URLSearchParams(window.location.search).get("eid") || undefined;
    if (eid) {
      setSessionEid(eid);
    }

    const timer = window.setTimeout(() => {
      if (engagedFired.current) return;

      if (document.visibilityState !== "visible") return;

      engagedFired.current = true;

      trackEvent("thank_you_engaged", {
        origin: "thank-you",
        path: window.location.pathname,
        ...(eid ? { event_id: eid } : {}),
      });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
