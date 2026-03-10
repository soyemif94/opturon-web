"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, Package, PencilLine, ScanLine, Warehouse } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  price: number;
  currency?: string;
  stock?: number;
  stockQty?: number;
  status?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Draft = {
  name: string;
  description: string;
  sku: string;
  price: string;
  stock: string;
  currency: string;
};

const emptyDraft: Draft = {
  name: "",
  description: "",
  sku: "",
  price: "",
  stock: "0",
  currency: "ARS"
};

export function CatalogManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState(Array.isArray(initialProducts) ? initialProducts : []);
  const [selectedId, setSelectedId] = useState<string | null>(initialProducts[0]?.id || null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) || null,
    [products, selectedId]
  );

  const metrics = useMemo(() => {
    const active = products.filter((product) => resolveStatus(product) === "active").length;
    const inactive = products.length - active;
    const stockValue = products.reduce((sum, product) => sum + resolvePrice(product) * resolveStock(product), 0);
    return { total: products.length, active, inactive, stockValue };
  }, [products]);

  function hydrateDraft(product?: Product | null) {
    return {
      name: product?.name || "",
      description: product?.description || "",
      sku: product?.sku || "",
      price: String(resolvePrice(product || ({} as Product))),
      stock: String(resolveStock(product || ({} as Product))),
      currency: product?.currency || "ARS"
    };
  }

  async function reloadProducts(preferredId?: string | null) {
    const response = await fetch("/api/app/catalog", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.error || "No se pudo refrescar el catalogo.");
    }

    const nextProducts = Array.isArray(json?.products) ? json.products : [];
    setProducts(nextProducts);
    const nextSelected =
      nextProducts.find((product: Product) => product.id === preferredId) ||
      nextProducts.find((product: Product) => product.id === selectedId) ||
      nextProducts[0] ||
      null;
    setSelectedId(nextSelected?.id || null);
    return nextSelected;
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const price = Number(draft.price);
    const stock = Number.parseInt(draft.stock, 10);
    if (!draft.name.trim()) {
      setFeedback({ tone: "warning", text: "El producto necesita al menos un nombre." });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFeedback({ tone: "warning", text: "El precio debe ser un numero valido." });
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setFeedback({ tone: "warning", text: "El stock debe ser cero o mayor." });
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const path = editingId ? `/api/app/catalog/${editingId}` : "/api/app/catalog";
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          sku: draft.sku.trim() || null,
          price,
          stock,
          currency: draft.currency.trim() || "ARS"
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo guardar el producto.");
      }

      const nextSelected = await reloadProducts(json?.product?.id || editingId || undefined);
      setEditingId(null);
      setDraft(emptyDraft);
      setFeedback({ tone: "success", text: editingId ? "Producto actualizado correctamente." : "Producto creado correctamente." });
      toast.success(editingId ? "Producto actualizado" : "Producto creado");
      if (nextSelected) {
        setSelectedId(nextSelected.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el producto.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al guardar producto", message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(product: Product) {
    setSelectedId(product.id);
    setEditingId(product.id);
    setDraft(hydrateDraft(product));
    setFeedback(null);
  }

  function startCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFeedback(null);
  }

  async function toggleStatus(product: Product) {
    const nextStatus = resolveStatus(product) === "active" ? "inactive" : "active";
    setStatusUpdatingId(product.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/catalog/${product.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo actualizar el estado del producto.");
      }

      const updated = json?.product;
      setProducts((current) => current.map((item) => (item.id === product.id ? updated : item)));
      toast.success(nextStatus === "active" ? "Producto activado" : "Producto desactivado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el estado del producto.";
      setFeedback({ tone: "error", text: message });
      toast.error("Error al actualizar estado", message);
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Boxes} label="Productos cargados" value={String(metrics.total)} helper="Base inicial del catalogo para ventas y pedidos." />
        <MetricCard icon={Package} label="Activos" value={String(metrics.active)} helper="Productos visibles para operar y vender." />
        <MetricCard icon={ScanLine} label="Inactivos" value={String(metrics.inactive)} helper="Productos pausados sin borrar historial." />
        <MetricCard icon={Warehouse} label="Valor bruto" value={formatCurrency(metrics.stockValue)} helper="Referencia simple de stock por precio actual." />
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-surface/70 px-4 py-3">
          <Badge variant={feedback.tone === "success" ? "success" : feedback.tone === "warning" ? "warning" : "danger"}>
            {feedback.text}
          </Badge>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">{metrics.total} productos</Badge>}>
            <div>
              <CardTitle className="text-xl">Catalogo del negocio</CardTitle>
              <CardDescription>Lista simple de productos con precio, stock y estado operativo para usar luego en pedidos y commerce conversacional.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                Todavia no hay productos. Crea el primero desde el panel lateral para empezar a poblar el catalogo.
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-[22px] border p-4 transition-colors ${
                    selectedId === product.id
                      ? "border-brand/35 bg-brand/8"
                      : "border-[color:var(--border)] bg-surface/55"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(product.id)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold">{product.name}</p>
                        <Badge variant={resolveStatus(product) === "active" ? "success" : "muted"}>
                          {resolveStatus(product) === "active" ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted">{product.sku || "Sin SKU"} · Stock {resolveStock(product)}</p>
                      <p className="mt-1 text-sm text-muted line-clamp-2">{product.description || "Sin descripcion cargada."}</p>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{formatCurrency(resolvePrice(product), product.currency || "ARS")}</p>
                      <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(product)}>
                        <PencilLine className="mr-1 h-4 w-4" />
                        Editar
                      </Button>
                      <Button type="button" variant="secondary" size="sm" disabled={statusUpdatingId === product.id} onClick={() => void toggleStatus(product)}>
                        {statusUpdatingId === product.id
                          ? "Actualizando..."
                          : resolveStatus(product) === "active"
                            ? "Desactivar"
                            : "Activar"}
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/app/catalog/${product.id}`}>
                          Ver
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant={editingId ? "warning" : "muted"}>{editingId ? "Edicion" : "Alta rapida"}</Badge>}>
              <div>
                <CardTitle className="text-xl">{editingId ? "Editar producto" : "Nuevo producto"}</CardTitle>
                <CardDescription>Completa lo minimo necesario para dejar el producto listo para catalogo, pedidos y futuras automatizaciones.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form className="space-y-4" onSubmit={saveProduct}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Combo mediodia" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SKU</label>
                    <Input value={draft.sku} onChange={(event) => setDraft((current) => ({ ...current, sku: event.target.value }))} placeholder="Ej. COMBO-MED-01" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Moneda</label>
                    <Input value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} placeholder="ARS" maxLength={3} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Precio</label>
                    <Input value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} placeholder="0" inputMode="decimal" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock basico</label>
                    <Input value={draft.stock} onChange={(event) => setDraft((current) => ({ ...current, stock: event.target.value }))} placeholder="0" inputMode="numeric" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripcion</label>
                  <Textarea className="min-h-[120px]" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Describe el producto de forma simple para el equipo y para futuros flujos de venta." />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button type="button" variant="ghost" onClick={startCreate}>
                    Limpiar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear producto"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={selectedProduct ? <Badge variant={resolveStatus(selectedProduct) === "active" ? "success" : "muted"}>{resolveStatus(selectedProduct) === "active" ? "Activo" : "Inactivo"}</Badge> : null}>
              <div>
                <CardTitle className="text-xl">Detalle rapido</CardTitle>
                <CardDescription>Contexto rapido del producto seleccionado para validar precio, stock y disponibilidad.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {!selectedProduct ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm text-muted">
                  Selecciona un producto del listado para ver su detalle.
                </div>
              ) : (
                <>
                  <DetailStat label="Producto" value={selectedProduct.name} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailStat label="Precio" value={formatCurrency(resolvePrice(selectedProduct), selectedProduct.currency || "ARS")} />
                    <DetailStat label="Stock" value={String(resolveStock(selectedProduct))} />
                    <DetailStat label="SKU" value={selectedProduct.sku || "Sin SKU"} />
                    <DetailStat label="Actualizado" value={formatDate(selectedProduct.updatedAt || selectedProduct.createdAt)} />
                  </div>
                  <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                    <p className="text-sm font-semibold">Descripcion</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{selectedProduct.description || "Sin descripcion cargada."}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function resolvePrice(product: Product) {
  return Number(product.price || 0);
}

function resolveStock(product: Product) {
  return Number((product.stock ?? product.stockQty) || 0);
}

function resolveStatus(product: Product) {
  if (product.status) return product.status;
  return product.active === false ? "inactive" : "active";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="flex items-start gap-4 p-5">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-surface/80">
          <Icon className="h-5 w-5 text-brandBright" />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function formatCurrency(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value?: string) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
