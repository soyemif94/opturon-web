"use client";

type EventParams = Record<string, any>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function track(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}
