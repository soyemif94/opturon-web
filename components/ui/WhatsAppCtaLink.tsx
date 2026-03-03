"use client";

import type { ReactNode } from "react";
import { trackWhatsAppClick } from "@/lib/analytics";

type WhatsAppCtaLinkProps = {
  href: string;
  origin: "hero" | "cta-final" | "sticky" | string;
  ariaLabel: string;
  className: string;
  isExternal?: boolean;
  onClick?: () => void;
  children: ReactNode;
};

export function WhatsAppCtaLink({
  href,
  origin,
  ariaLabel,
  className,
  isExternal = false,
  onClick,
  children
}: WhatsAppCtaLinkProps) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={className}
      onClick={() => {
        trackWhatsAppClick(origin);
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}
