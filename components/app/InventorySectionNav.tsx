"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const items = [
  { href: "/app/inventory", label: "Resumen" },
  { href: "/app/inventory#movimientos", label: "Movimientos" },
  { href: "/app/inventory#lotes", label: "Lotes" },
  { href: "/app/inventory/suppliers", label: "Proveedores" }
];

export function InventorySectionNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.href === "/app/inventory/suppliers" ? pathname.startsWith("/app/inventory/suppliers") : pathname === "/app/inventory";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition",
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
  );
}
