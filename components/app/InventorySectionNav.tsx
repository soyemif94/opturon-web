"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/app/inventory", label: "Resumen" },
  { href: "/app/inventory/movements", label: "Movimientos" },
  { href: "/app/inventory#lotes", label: "Lotes" },
  { href: "/app/inventory/suppliers", label: "Proveedores" },
  { href: "/app/inventory/receipts", label: "Recepciones" },
  { href: "/app/inventory/receipts/new", label: "Ingresar mercaderia" }
];

export function InventorySectionNav({ canBulkAdjust = false }: { canBulkAdjust?: boolean }) {
  const pathname = usePathname();
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const visibleItems = canBulkAdjust
    ? [...items, { href: "/app/inventory/bulk-adjust", label: "Carga masiva" }]
    : items;

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav data-horizontal-rail="inventory-sections" aria-label="Secciones de Inventario" className="max-w-full overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full gap-2">
      {visibleItems.map((item) => {
        const active =
          item.href === "/app/inventory#lotes"
            ? false
            : item.href === "/app/inventory/suppliers"
            ? pathname.startsWith("/app/inventory/suppliers")
            : item.href === "/app/inventory/movements"
              ? pathname.startsWith("/app/inventory/movements")
              : item.href === "/app/inventory/receipts"
              ? pathname.startsWith("/app/inventory/receipts") && !pathname.startsWith("/app/inventory/receipts/new")
              : item.href === "/app/inventory/receipts/new"
                ? pathname.startsWith("/app/inventory/receipts/new")
                : item.href === "/app/inventory/bulk-adjust"
                  ? pathname.startsWith("/app/inventory/bulk-adjust")
                : pathname === "/app/inventory";
        return (
          <Link
            key={item.href}
            ref={active ? activeItemRef : undefined}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              active
                ? "border-brand/40 bg-brand/15 text-white"
                : "border-[color:var(--border)] bg-surface/55 text-muted hover:text-white"
            )}
          >
            {item.label}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
