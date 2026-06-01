"use client";

import Link from "next/link";
import { type ComponentType, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Bot,
  CircleAlert,
  PackageCheck,
  Search,
  Sparkles,
  TriangleAlert
} from "lucide-react";
import { ClientPageShell } from "@/components/app/client-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney, titleCaseLabel } from "@/lib/billing";
import { type PortalProduct } from "@/lib/api";
import { formatExpirationDate, getExpirationBadgePresentation, getProductExpirationStatus } from "@/lib/product-expiration";
import { getDiscountedPrice } from "@/lib/product-pricing";
import { getStockState } from "@/lib/stock-state";
import { cn } from "@/lib/cn";

type InventoryStatusFilter = "all" | "available" | "low" | "out" | "restock" | "urgent";
type UrgencyFilter = "all" | "with_data" | "expiring_soon" | "critical" | "expired";
type GroupKey = "available" | "low" | "out" | "restock" | "urgent";

type InventoryProduct = PortalProduct & {
  effectivePrice: number;
  stockValue: number;
  stockState: ReturnType<typeof getStockState>;
  expiration: ReturnType<typeof getProductExpirationStatus>;
  expirationBadge: ReturnType<typeof getExpirationBadgePresentation>;
  active: boolean;
  categoryLabel: string;
  searchLabel: string;
  needsRestock: boolean;
  isUrgent: boolean;
  missingBotFields: string[];
  botReady: boolean;
};

const STATUS_FILTERS: Array<{ value: InventoryStatusFilter; label: string }> = [
  { value: "all", label: "Todos los estados" },
  { value: "available", label: "Disponibles" },
  { value: "low", label: "Stock bajo" },
  { value: "out", label: "Agotados" },
  { value: "restock", label: "Requieren reposicion" },
  { value: "urgent", label: "Urgentes / vencimiento" }
];

const URGENCY_FILTERS: Array<{ value: UrgencyFilter; label: string }> = [
  { value: "all", label: "Toda urgencia" },
  { value: "with_data", label: "Con vencimiento" },
  { value: "expiring_soon", label: "Proximo a vencer" },
  { value: "critical", label: "Critico" },
  { value: "expired", label: "Vencido" }
];

const GROUP_META: Record<
  GroupKey,
  {
    title: string;
    description: string;
    empty: string;
    accent: string;
  }
> = {
  available: {
    title: "Disponibles",
    description: "Productos activos con stock saludable para operar hoy.",
    empty: "No hay productos disponibles con stock saludable.",
    accent: "from-emerald-500/18 via-emerald-400/6 to-transparent"
  },
  low: {
    title: "Bajo stock",
    description: "Productos activos con pocas unidades antes de entrar en riesgo.",
    empty: "No hay productos con stock bajo en este filtro.",
    accent: "from-amber-500/18 via-amber-400/6 to-transparent"
  },
  out: {
    title: "Agotados",
    description: "Productos sin stock que hoy no pueden responder disponibilidad positiva.",
    empty: "No hay productos agotados en este filtro.",
    accent: "from-rose-500/18 via-rose-400/6 to-transparent"
  },
  restock: {
    title: "Requieren reposicion",
    description: "Vista operativa para priorizar compra, produccion o reabastecimiento.",
    empty: "No hay productos que requieran reposicion en este filtro.",
    accent: "from-orange-500/18 via-orange-400/6 to-transparent"
  },
  urgent: {
    title: "Vencimiento / urgencia",
    description: "Productos con fecha vencida, critica o proxima a vencer segun data real.",
    empty: "No hay urgencias o vencimientos cargados en este filtro.",
    accent: "from-sky-500/18 via-sky-400/6 to-transparent"
  }
};

export function InventoryWorkspace({
  initialProducts,
  readOnly = false
}: {
  initialProducts: PortalProduct[];
  readOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");

  const products = useMemo<InventoryProduct[]>(
    () =>
      (Array.isArray(initialProducts) ? initialProducts : []).map((product) => {
        const active = product.status === "active";
        const stock = Number(product.stock || 0);
        const pricing = getDiscountedPrice(product.price, product.discountPercentage);
        const expiration = getProductExpirationStatus(product.expirationDate);
        const expirationBadge = getExpirationBadgePresentation(product.expirationDate);
        const categoryLabel = String(product.categoryName || "").trim() || "Sin categoria";
        const hasName = String(product.name || "").trim().length > 0;
        const hasPrice = Number(product.price || 0) > 0;
        const hasStock = stock > 0;
        const hasCategory = Boolean(String(product.categoryId || "").trim() || String(product.categoryName || "").trim());
        const hasImage = Boolean(String(product.image?.url || "").trim());
        const missingBotFields = [
          !hasImage ? "Imagen" : null,
          !hasStock ? "Stock" : null,
          !hasCategory ? "Categoria" : null,
          !hasPrice ? "Precio" : null,
          !hasName ? "Nombre" : null
        ].filter(Boolean) as string[];

        return {
          ...product,
          active,
          categoryLabel,
          effectivePrice: pricing.finalPrice,
          stockValue: pricing.finalPrice * Math.max(stock, 0),
          stockState: getStockState(stock),
          expiration,
          expirationBadge,
          searchLabel: [product.name, product.sku, product.description, product.categoryName, product.subcategory]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
          needsRestock: active && stock <= 5,
          isUrgent: Boolean(expiration && expiration.state !== "normal"),
          missingBotFields,
          botReady: hasName && hasPrice && hasStock && hasCategory
        };
      }),
    [initialProducts]
  );

  const categoryOptions = useMemo(() => {
    const categories = new Map<string, string>();
    for (const product of products) {
      const categoryId = String(product.categoryId || "").trim() || "uncategorized";
      if (!categories.has(categoryId)) {
        categories.set(categoryId, product.categoryLabel);
      }
    }
    return Array.from(categories.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "es"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (query && !product.searchLabel.includes(query)) return false;
      if (categoryFilter !== "all") {
        const categoryId = String(product.categoryId || "").trim() || "uncategorized";
        if (categoryId !== categoryFilter) return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "available" && !isAvailable(product)) return false;
        if (statusFilter === "low" && !isLowStock(product)) return false;
        if (statusFilter === "out" && !isOutOfStock(product)) return false;
        if (statusFilter === "restock" && !product.needsRestock) return false;
        if (statusFilter === "urgent" && !product.isUrgent) return false;
      }
      if (urgencyFilter !== "all") {
        if (urgencyFilter === "with_data" && !product.expiration) return false;
        if (urgencyFilter !== "with_data" && product.expiration?.state !== urgencyFilter) return false;
      }
      return true;
    });
  }, [categoryFilter, products, search, statusFilter, urgencyFilter]);

  const metrics = useMemo(() => {
    const activeProducts = products.filter((product) => product.active);
    const lowStockCount = activeProducts.filter(isLowStock).length;
    const outOfStockCount = activeProducts.filter(isOutOfStock).length;
    const urgentCount = activeProducts.filter((product) => product.isUrgent).length;
    const stockValue = activeProducts.reduce((sum, product) => sum + product.stockValue, 0);
    const botReadyCount = activeProducts.filter((product) => product.botReady).length;
    const currencies = Array.from(new Set(activeProducts.map((product) => product.currency || "ARS")));
    return {
      activeProducts: activeProducts.length,
      lowStockCount,
      outOfStockCount,
      urgentCount,
      stockValue,
      botReadyCount,
      currencies
    };
  }, [products]);

  const groupedProducts = useMemo(
    () => ({
      available: filteredProducts.filter(isAvailable),
      low: filteredProducts.filter(isLowStock),
      out: filteredProducts.filter(isOutOfStock),
      restock: filteredProducts.filter((product) => product.needsRestock),
      urgent: filteredProducts.filter((product) => product.isUrgent)
    }),
    [filteredProducts]
  );

  const criticalProducts = useMemo(
    () =>
      [...products]
        .filter((product) => product.active && (product.isUrgent || product.needsRestock))
        .sort((left, right) => rankCriticalProduct(left) - rankCriticalProduct(right))
        .slice(0, 5),
    [products]
  );

  const botGaps = useMemo(
    () =>
      [...products]
        .filter((product) => product.active && product.missingBotFields.length > 0)
        .sort((left, right) => right.missingBotFields.length - left.missingBotFields.length)
        .slice(0, 5),
    [products]
  );

  return (
    <ClientPageShell
      title="Inventario"
      description="Centro operativo de stock para leer disponibilidad real, detectar alertas y preparar mejor la respuesta comercial del negocio sin duplicar el catalogo."
      badge="Stock operativo premium"
    >
      <div className="grid gap-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Productos activos"
            value={String(metrics.activeProducts)}
            helper="Productos activos reutilizados desde catalogo."
            icon={Boxes}
          />
          <MetricCard
            label="Stock bajo"
            value={String(metrics.lowStockCount)}
            helper="Activos con 1 a 5 unidades."
            icon={TriangleAlert}
          />
          <MetricCard
            label="Agotados"
            value={String(metrics.outOfStockCount)}
            helper="Activos sin stock disponible."
            icon={CircleAlert}
          />
          <MetricCard
            label="Valor estimado"
            value={metrics.currencies.length === 1 ? formatMoney(metrics.stockValue, metrics.currencies[0]) : "Monedas mixtas"}
            helper={
              metrics.currencies.length === 1
                ? "Precio comercial actual x stock real."
                : "No sumamos inventario en una moneda falsa cuando hay mas de una divisa."
            }
            icon={Sparkles}
          />
          <MetricCard
            label="Urgencias"
            value={String(metrics.urgentCount)}
            helper="Vencimientos criticos, proximos o vencidos."
            icon={AlertTriangle}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="space-y-6">
            <Card className="relative overflow-hidden border-white/10 bg-card/90">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
              <CardHeader>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">Mesa visual</Badge>
                    <Badge variant="outline">Lectura en vivo desde catalogo</Badge>
                  </div>
                  <CardTitle className="mt-3 text-xl">Centro operativo</CardTitle>
                  <CardDescription>
                    Busca por nombre, filtra por categoria y separa el stock por estado real sin crear un sistema paralelo.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 pt-0 md:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,1fr))]">
                <div className="relative md:col-span-2 xl:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nombre, SKU o descripcion"
                    className="pl-9"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-10 rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm text-text outline-none"
                >
                  <option value="all">Todas las categorias</option>
                  {categoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as InventoryStatusFilter)}
                  className="h-10 rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm text-text outline-none"
                >
                  {STATUS_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={urgencyFilter}
                  onChange={(event) => setUrgencyFilter(event.target.value as UrgencyFilter)}
                  className="h-10 rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm text-text outline-none"
                >
                  {URGENCY_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {(["available", "low", "out", "restock", "urgent"] as GroupKey[]).map((groupKey) => {
              const group = groupedProducts[groupKey];
              const meta = GROUP_META[groupKey];
              return (
                <Card key={groupKey} className="overflow-hidden border-white/8 bg-card/90">
                  <CardHeader>
                    <div>
                      <Badge variant="outline">{group.length} productos</Badge>
                      <CardTitle className="mt-3 text-xl">{meta.title}</CardTitle>
                      <CardDescription>{meta.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {group.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-[color:var(--border)] bg-surface/40 p-5 text-sm text-muted">
                        {meta.empty}
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {group.map((product) => (
                          <ProductRow key={`${groupKey}-${product.id}`} product={product} readOnly={readOnly} accent={meta.accent} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <aside className="space-y-6">
            <Card className="border-white/8 bg-card/90">
              <CardHeader>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={metrics.botReadyCount > 0 ? "success" : "warning"}>Preparado para el bot</Badge>
                    <Bot className="h-4 w-4 text-brandBright" />
                  </div>
                  <CardTitle className="mt-3 text-xl">Bot readiness</CardTitle>
                  <CardDescription>
                    El bot aprovecha mejor nombre, stock, precio y categoria. La imagen mejora la lectura comercial visual.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <MetricMini label="Listos para responder" value={`${metrics.botReadyCount}/${metrics.activeProducts || 0}`} />
                <MetricMini label="Sin stock" value={String(metrics.outOfStockCount)} />
                <MetricMini label="Con alertas" value={String(botGaps.length)} />
                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4 text-sm text-muted">
                  El worker no cambia en esta fase. Esta vista solo deja visible que informacion comercial ya esta lista y cual falta completar.
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-card/90">
              <CardHeader>
                <div>
                  <Badge variant="danger">Criticos</Badge>
                  <CardTitle className="mt-3 text-xl">Productos prioritarios</CardTitle>
                  <CardDescription>Combinamos riesgo por stock y vencimiento usando la data real disponible.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {criticalProducts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm text-muted">
                    No hay productos criticos detectados.
                  </div>
                ) : (
                  criticalProducts.map((product) => (
                    <SidebarProduct key={product.id} product={product} />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-card/90">
              <CardHeader>
                <div>
                  <Badge variant="warning">Reposicion sugerida</Badge>
                  <CardTitle className="mt-3 text-xl">Radar de compra</CardTitle>
                  <CardDescription>Priorizacion simple para productos sin stock o en zona baja.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm text-muted">
                <MetricMini label="Sin stock" value={String(metrics.outOfStockCount)} />
                <MetricMini label="Bajo stock" value={String(metrics.lowStockCount)} />
                <MetricMini
                  label="Valor activo"
                  value={metrics.currencies.length === 1 ? formatMoney(metrics.stockValue, metrics.currencies[0]) : "Monedas mixtas"}
                />
                <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                  Prioriza primero agotados, luego stock bajo y despues productos con vencimiento critico para evitar perdida comercial.
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-card/90">
              <CardHeader>
                <div>
                  <Badge variant="outline">Datos incompletos</Badge>
                  <CardTitle className="mt-3 text-xl">Huecos para el bot</CardTitle>
                  <CardDescription>Productos activos con campos faltantes que hoy limitan disponibilidad o contexto.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {botGaps.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] p-4 text-sm text-muted">
                    No se detectaron huecos relevantes en los productos activos.
                  </div>
                ) : (
                  botGaps.map((product) => (
                    <div key={`gap-${product.id}`} className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">{product.name}</p>
                          <p className="mt-1 text-xs text-muted">{product.categoryLabel}</p>
                        </div>
                        <Badge variant="warning">{product.missingBotFields.length} faltantes</Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted">{product.missingBotFields.join(" · ")}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </ClientPageShell>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon
}: {
  label: string;
  value: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="relative overflow-hidden border-white/8 bg-card/90">
      <CardContent className="relative pt-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-brand/10 p-2 text-brandBright">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted">{helper}</p>
      </CardContent>
    </Card>
  );
}

function ProductRow({
  product,
  readOnly,
  accent
}: {
  product: InventoryProduct;
  readOnly: boolean;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-surface/45">
      <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
      <div className="grid gap-4 p-4 lg:grid-cols-[96px_minmax(0,1fr)_auto]">
        <ProductImage image={product.image || null} name={product.name} />

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={resolveStockBadgeVariant(product)}>{product.stockState.label}</Badge>
            <Badge variant={product.expirationBadge.variant}>{product.expirationBadge.label}</Badge>
            <Badge variant={product.botReady ? "success" : "warning"}>
              {product.botReady ? "Preparado para el bot" : "Datos incompletos"}
            </Badge>
            <Badge variant={product.active ? "success" : "muted"}>{titleCaseLabel(product.status)}</Badge>
          </div>

          <div>
            <p className="text-lg font-semibold text-text">{product.name}</p>
            <p className="mt-1 text-sm text-muted">
              {product.categoryLabel}
              {product.subcategory ? ` · ${product.subcategory}` : ""}
              {product.sku ? ` · ${product.sku}` : ""}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            <DataPoint label="Stock" value={String(product.stock)} />
            <DataPoint label="Precio" value={formatMoney(product.effectivePrice, product.currency)} />
            <DataPoint
              label="Valor estimado"
              value={formatMoney(product.stockValue, product.currency)}
              className="xl:col-span-2 2xl:col-span-1"
            />
            <DataPoint label="Vencimiento" value={formatExpirationDate(product.expirationDate)} />
            <DataPoint
              label="Bot"
              value={product.missingBotFields.length === 0 ? "Completo" : `Falta ${product.missingBotFields.join(", ")}`}
              className="xl:col-span-2 2xl:col-span-1"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:w-[180px]">
          <Button asChild size="sm" className="rounded-2xl">
            <Link href={`/app/catalog/${product.id}`}>
              Ver producto
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {!readOnly ? (
            <Button asChild size="sm" variant="secondary" className="rounded-2xl">
              <Link href={`/app/catalog/${product.id}/edit`}>Editar en catalogo</Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="ghost" className="rounded-2xl">
            <Link href="/app/catalog">Ir a catalogo</Link>
          </Button>
          {product.missingBotFields.length > 0 ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              {product.missingBotFields.join(" · ")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SidebarProduct({ product }: { product: InventoryProduct }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">{product.name}</p>
          <p className="mt-1 text-xs text-muted">
            {product.categoryLabel} · Stock {product.stock}
          </p>
        </div>
        <Badge variant={resolveStockBadgeVariant(product)}>{product.stockState.label}</Badge>
      </div>
      <p className="mt-3 text-xs text-muted">{product.expirationBadge.helper}</p>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-text">{value}</p>
    </div>
  );
}

function DataPoint({
  label,
  value,
  className
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.02)] p-3",
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 break-words text-sm font-medium leading-5 text-text">{value}</p>
    </div>
  );
}

function ProductImage({
  image,
  name
}: {
  image: { url: string; alt?: string | null } | null;
  name: string;
}) {
  if (image?.url) {
    return (
      <img
        src={image.url}
        alt={image.alt || name || "Imagen del producto"}
        className="aspect-square h-24 w-24 rounded-[22px] border border-[color:var(--border)] object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-[22px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(176,80,0,0.18),rgba(255,255,255,0.04))] text-xs font-medium text-muted">
      <PackageCheck className="h-5 w-5" />
    </div>
  );
}

function isAvailable(product: InventoryProduct) {
  return product.active && product.stock > 5;
}

function isLowStock(product: InventoryProduct) {
  return product.active && product.stock > 0 && product.stock <= 5;
}

function isOutOfStock(product: InventoryProduct) {
  return product.active && product.stock <= 0;
}

function rankCriticalProduct(product: InventoryProduct) {
  if (product.expiration?.state === "expired") return 0;
  if (product.expiration?.state === "critical") return 1;
  if (isOutOfStock(product)) return 2;
  if (product.expiration?.state === "expiring_soon") return 3;
  if (isLowStock(product)) return 4;
  return 5;
}

function resolveStockBadgeVariant(product: InventoryProduct): "success" | "warning" | "danger" {
  if (product.stockState.variant === "danger") return "danger";
  if (product.stockState.variant === "warning") return "warning";
  return "success";
}
