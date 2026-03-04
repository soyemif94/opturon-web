"use client";

type EventParams = Record<string, any>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function track(eventName: string, params?: EventParams): void {
  if (!isGtagReady()) return;
  window.gtag?.("event", eventName, params ?? {});
}

export function isGtagReady(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.gtag === "function";
}
