"use client";

import { useEffect, useRef } from "react";
import { trackScrollDepth, trackView } from "@/lib/analytics";

const SCROLL_KEY = "opturon_scroll_75";
const PACKAGES_KEY = "opturon_view_packages";

function hasSessionKey(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setSessionKey(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // no-op
  }
}

export function HomePageEvents() {
  const scrollTrackedRef = useRef(false);
  const packagesTrackedRef = useRef(false);

  useEffect(() => {
    scrollTrackedRef.current = hasSessionKey(SCROLL_KEY);
    packagesTrackedRef.current = hasSessionKey(PACKAGES_KEY);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (scrollTrackedRef.current) return;

      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollableHeight = Math.max(documentHeight - viewportHeight, 1);
      const ratio = scrollTop / scrollableHeight;

      if (ratio >= 0.75) {
        scrollTrackedRef.current = true;
        setSessionKey(SCROLL_KEY);
        trackScrollDepth(75);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const target = document.getElementById("home-packages");
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || packagesTrackedRef.current) return;

        packagesTrackedRef.current = true;
        setSessionKey(PACKAGES_KEY);
        trackView("packages");
        observer.disconnect();
      },
      { threshold: 0.3 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return null;
}

