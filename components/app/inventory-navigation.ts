export type InventoryNavigationItem = {
  href: string;
  label: string;
  capability: "inventory" | "manage_inventory_sensitive";
};

export const INVENTORY_NAVIGATION_ITEMS: readonly InventoryNavigationItem[] = [
  { href: "/app/inventory", label: "Resumen", capability: "inventory" },
  { href: "/app/inventory/movements", label: "Movimientos", capability: "inventory" },
  { href: "/app/inventory#lotes", label: "Lotes", capability: "inventory" },
  { href: "/app/inventory/suppliers", label: "Proveedores", capability: "inventory" },
  { href: "/app/inventory/receipts", label: "Recepciones", capability: "inventory" },
  { href: "/app/inventory#vencimientos", label: "Vencimientos", capability: "inventory" },
  { href: "/app/inventory/receipts/new", label: "Ingresar mercaderia", capability: "inventory" },
  { href: "/app/inventory/bulk-adjust", label: "Carga masiva", capability: "manage_inventory_sensitive" }
];

export function inventoryNavigationItems(canBulkAdjust: boolean) {
  return INVENTORY_NAVIGATION_ITEMS.filter((item) => item.capability === "inventory" || canBulkAdjust);
}

export function resolveInventoryNavigationHref(pathname: string, hash: string, canBulkAdjust: boolean) {
  const visibleItems = inventoryNavigationItems(canBulkAdjust);
  const normalizedHash = hash.startsWith("#") ? hash : hash ? `#${hash}` : "";
  let href = "/app/inventory";

  if (pathname.startsWith("/app/inventory/movements")) href = "/app/inventory/movements";
  else if (pathname.startsWith("/app/inventory/suppliers")) href = "/app/inventory/suppliers";
  else if (pathname.startsWith("/app/inventory/receipts/new")) href = "/app/inventory/receipts/new";
  else if (pathname.startsWith("/app/inventory/receipts")) href = "/app/inventory/receipts";
  else if (pathname.startsWith("/app/inventory/bulk-adjust")) href = "/app/inventory/bulk-adjust";
  else if (pathname === "/app/inventory" && normalizedHash === "#lotes") href = "/app/inventory#lotes";
  else if (pathname === "/app/inventory" && normalizedHash === "#vencimientos") href = "/app/inventory#vencimientos";

  return visibleItems.some((item) => item.href === href) ? href : "/app/inventory";
}
