"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  inventoryNavigationItems,
  resolveInventoryNavigationHref
} from "@/components/app/inventory-navigation";
import { cn } from "@/lib/cn";

function subscribeToHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHashSnapshot() {
  return window.location.hash;
}

export function InventorySectionNav({ canBulkAdjust = false }: { canBulkAdjust?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, () => "");
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const visibleItems = inventoryNavigationItems(canBulkAdjust);
  const activeHref = resolveInventoryNavigationHref(pathname, hash, canBulkAdjust);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
  }, [activeHref]);

  return (
    <div className="min-w-0 max-w-full">
      <label className="grid gap-2 md:hidden">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Seccion de Inventario</span>
        <select
          data-inventory-mobile-navigation
          aria-label="Seleccionar seccion de Inventario"
          className="h-12 w-full min-w-0 max-w-full rounded-2xl border border-[color:var(--border)] bg-[#111827] px-4 text-sm font-medium text-white shadow-[var(--card-shadow)] [color-scheme:dark] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          value={activeHref}
          onChange={(event) => router.push(event.target.value)}
        >
          {visibleItems.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">Todas las secciones disponibles estan dentro de este selector.</span>
      </label>

      <nav
        data-horizontal-rail="inventory-sections"
        aria-label="Secciones de Inventario"
        className="hidden max-w-full overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] md:block [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max min-w-full gap-2">
          {visibleItems.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                ref={active ? activeItemRef : undefined}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  active
                    ? "border-brand/40 bg-brand/15 text-white [[data-app-theme=light]_&]:text-[color:var(--text)]"
                    : "border-[color:var(--border)] bg-surface/55 text-muted hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
