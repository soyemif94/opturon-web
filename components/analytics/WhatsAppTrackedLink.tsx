"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { track } from "@/lib/ga";

type WhatsAppTrackedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> & {
  href: string;
  origin?: string;
  children: ReactNode;
};

export function WhatsAppTrackedLink({
  href,
  origin = "unknown",
  onClick,
  children,
  ...rest
}: WhatsAppTrackedLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    track("generate_lead", {
      method: "whatsapp",
      origin,
      link_url: href
    });
    track("whatsapp_click", {
      origin,
      link_url: href
    });

    onClick?.(event);
  }

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
