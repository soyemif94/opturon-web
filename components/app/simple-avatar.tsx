"use client";

import { cn } from "@/lib/cn";

function initials(name?: string) {
  const value = String(name || "").trim();
  if (!value) return "CT";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function SimpleAvatar({
  src,
  name,
  className = "",
  imageClassName = "",
  fallbackClassName = ""
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const safeSrc = String(src || "").trim();
  const label = String(name || "").trim() || "Sin nombre";

  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden", className)}>
      {safeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeSrc} alt={label} className={cn("h-full w-full object-cover", imageClassName)} />
      ) : (
        <span className={cn("inline-flex h-full w-full items-center justify-center font-semibold", fallbackClassName)}>{initials(label)}</span>
      )}
    </span>
  );
}
