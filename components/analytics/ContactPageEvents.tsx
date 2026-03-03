"use client";

import { useEffect } from "react";
import { trackView } from "@/lib/analytics";

export function ContactPageEvents() {
  useEffect(() => {
    trackView("contact");
  }, []);

  return null;
}