"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Package, Receipt, ShoppingBag } from "lucide-react";
import type { PortalOrder } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ORDER_STATUS_OPTIONS = [
  "new",
  "pending_payment",
  "paid",
  "preparing",
  "ready",
  "delivered",
  "cancelled"
] as const;

type OrdersHubProps = {
  initialOrders: PortalOrder[];
  readOnly?: boolean;
  backendReady: boolean;
};

type CatalogProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price: number;
  currency?: string;
  stock?: number;
  stockQty?: number;
  status?: string;
  active?: boolean;
};

type OrderFormState = {
  customerName: string;
  customerPhone: string;
  notes: string;
  productId: string;
  quantity: string;
};

const initialForm: OrderFormState = {
  customerName: "",
  customerPhone: "",
  notes: "",
  productId: "",
  quantity: "1"
};

export function OrdersHub({ initialOrders, readOnly = false, backendReady }: OrdersHubProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<PortalOrder | null>(initialOrders[0] || null);
  const [form, setForm] = useState<OrderFormState>(initialForm);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);

  const activeProducts = useMemo(
    () => products.filter((product) => resolveProductStatus(product) === "active"),
    [products]
  );

  const selectedProduct = useMemo(
    () => activeProducts.find((product) => product.id === form.productId) || null,
    [activeProducts, form.productId]
  );

  const visibleTotal = useMemo(() => {
    const quantity = Number.parseInt(form.quantity, 10);
    if (!selectedProduct || !Number.isInteger(quantity) || quantity <= 0) return 0;
    return Number((resolveProductPrice(selectedProduct) * quantity).toFixed(2));
  }, [form.quantity, selectedProduct]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const preparing = orders.filter((order) => order.orderStatus === "preparing" || order.orderStatus === "ready").length;
    const pending = orders.filter((order) => order.orderStatus === "new" || order.orderStatus === "pending_payment").length;

    return {
      count: orders.length,
      totalRevenue,
      preparing,
      pending
    };
  }, [orders]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setProductsLoading(true);
      try {
        const response = await fetch("/api/app/catalog", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(json?.error || "No se pudo cargar el catalogo.");
        }

        if (!cancelled) {
          const nextProducts = Array.isArray(json?.products) ? json.products : [];
          setProducts(nextProducts);
          setForm((current) => {
            if (current.productId) return current;
            const firstActive = nextProducts.find((product: CatalogProduct) => resolveProductStatus(product) === "active");
            return firstActive ? { ...current, productId: firstActive.id } : current;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback({
            tone: "danger",
            text: error instanceof Error ? error.message : "No se pudo cargar el catalogo para pedidos."
          });
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadOrders(preferredOrderId?: string) {
    const response = await fetch("/api/app/orders", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.error || "No se pudo actualizar el listado de pedidos.");
    }

    const nextOrders = Array.isArray(json?.orders) ? json.orders : [];
    setOrders(nextOrders);

    const preferredOrder =
      nextOrders.find((order: PortalOrder) => order.id === preferredOrderId) ||
      nextOrders.find((order: PortalOrder) => order.id === selectedOrder?.id) ||
      nextOrders[0] ||
      null;

    setSelectedOrder(preferredOrder);
    return nextOrders;
  }

  async function loadOrderDetail(orderId: string) {
    setLoadingDetailId(orderId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/app/orders/${orderId}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo cargar el detalle del pedido.");
      }

      setSelectedOrder(json.order || null);
    } catch (error) {
      setFeedback({
        tone: "danger",
        text: error instanceof Error ? error.message : "No se pudo cargar el detalle del pedido."
      });
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const itemQuantity = Number.parseInt(form.quantity, 10);
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setFeedback({ tone: "warning", text: "Completa cliente y telefono para crear el pedido." });
      return;
    }
    if (!form.productId || !selectedProduct) {
      setFeedback({ tone: "warning", text: "Selecciona un producto activo del catalogo." });
      return;
    }
    if (!Number.isInteger(itemQuantity) || itemQuantity <= 0) {
      setFeedback({ tone: "warning", text: "La cantidad del producto debe ser mayor a cero." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/app/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          notes: form.notes.trim(),
          items: [
            {
              productId: form.productId,
              quantity: itemQuantity
            }
          ]
        })
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo crear el pedido.");
      }

      await reloadOrders(json?.order?.id);
      setForm((current) => ({
        ...initialForm,
        productId: current.productId
      }));
      setFeedback({ tone: "success", text: "Pedido creado correctamente con un producto real del catalogo." });
    } catch (error) {
      setFeedback({
        tone: "danger",
        text: error instanceof Error ? error.message : "No se pudo crear el pedido."
      });
    } finally {
      setSaving(false);
    }
  }

  async function changeOrderStatus(orderId: string, orderStatus: string) {
    setStatusUpdatingId(orderId);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || "No se pudo actualizar el estado del pedido.");
      }

      const updatedOrder = json.order as PortalOrder;
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setSelectedOrder((current) => (current?.id === updatedOrder.id ? updatedOrder : current));
      setFeedback({ tone: "success", text: "Estado del pedido actualizado." });
    } catch (error) {
      setFeedback({
        tone: "danger",
        text: error instanceof Error ? error.message : "No se pudo actualizar el estado del pedido."
      });
    } finally {
      setStatusUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Pedidos registrados" value={String(stats.count)} helper="Pedidos internos visibles en el portal." />
        <MetricCard icon={Receipt} label="Facturacion potencial" value={formatCurrency(stats.totalRevenue)} helper="Total bruto de los pedidos registrados." />
        <MetricCard icon={ShoppingBag} label="Pendientes" value={String(stats.pending)} helper="Pedidos nuevos o esperando pago." />
        <MetricCard icon={Package} label="En preparacion" value={String(stats.preparing)} helper="Pedidos en marcha para el equipo." />
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-surface/70 px-4 py-3">
          <Badge variant={feedback.tone}>{feedback.text}</Badge>
        </div>
      ) : null}

      {!backendReady ? (
        <Card className="border-white/6 bg-card/90">
          <CardHeader>
            <div>
              <CardTitle>Pedidos aun no disponibles</CardTitle>
              <CardDescription>Este modulo necesita el backend del portal configurado para listar y registrar pedidos reales.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant={readOnly ? "warning" : "success"}>{readOnly ? "Solo lectura" : "Operativo"}</Badge>}>
              <div>
                <CardTitle className="text-xl">Pedidos activos</CardTitle>
                <CardDescription>Consulta pedidos, revisa su estado y entra al detalle para prepararlos desde el panel.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                  Todavia no hay pedidos cargados. Usa el formulario lateral para registrar el primero y dejar visible el flujo completo en el panel.
                </div>
              ) : (
                orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => void loadOrderDetail(order.id)}
                    className={`w-full rounded-[22px] border p-4 text-left transition-colors ${
                      selectedOrder?.id === order.id
                        ? "border-brand/35 bg-brand/8"
                        : "border-[color:var(--border)] bg-surface/55 hover:bg-surface/80"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{order.customerName}</p>
                          <Badge variant={badgeForOrderStatus(order.orderStatus)}>{labelForOrderStatus(order.orderStatus)}</Badge>
                          <Badge variant={badgeForPaymentStatus(order.paymentStatus)}>{labelForPaymentStatus(order.paymentStatus)}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted">{order.customerPhone}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                          <span>{order.items.length} item(s)</span>
                          <span>•</span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium">{formatCurrency(order.total, order.currency)}</p>
                        <ArrowRight className="h-4 w-4 text-muted" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant="muted">Alta desde catalogo</Badge>}>
              <div>
                <CardTitle className="text-xl">Registrar pedido</CardTitle>
                <CardDescription>Selecciona un producto real del catalogo, indica cantidad y crea el pedido con snapshots consistentes.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form className="space-y-4" onSubmit={createOrder}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cliente</label>
                    <Input
                      value={form.customerName}
                      onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                      placeholder="Ej. Maria Gomez"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefono</label>
                    <Input
                      value={form.customerPhone}
                      onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))}
                      placeholder="Ej. +54 9 291 555 1234"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notas</label>
                  <Textarea
                    className="min-h-[112px]"
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Instrucciones de preparacion, retiro o entrega."
                  />
                </div>

                <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4">
                  <p className="text-sm font-semibold">Producto del pedido</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
                    <div className="space-y-2">
                      <label className="text-sm text-muted">Producto</label>
                      <select
                        className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                        value={form.productId}
                        onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
                        disabled={productsLoading || activeProducts.length === 0}
                      >
                        <option value="">{productsLoading ? "Cargando catalogo..." : "Selecciona un producto"}</option>
                        {activeProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}{product.sku ? ` · ${product.sku}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted">Cantidad</label>
                      <Input
                        value={form.quantity}
                        onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                        placeholder="1"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <DetailStat label="Precio unitario" value={selectedProduct ? formatCurrency(resolveProductPrice(selectedProduct), selectedProduct.currency || "ARS") : "Pendiente"} />
                    <DetailStat label="Stock catalogo" value={selectedProduct ? String(resolveProductStock(selectedProduct)) : "Pendiente"} />
                    <DetailStat label="Total estimado" value={selectedProduct ? formatCurrency(visibleTotal, selectedProduct.currency || "ARS") : "Pendiente"} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted">
                    Fase 3: el pedido ya toma `productId`, `nameSnapshot` y `priceSnapshot` desde el catalogo real.
                  </p>
                  <Button type="submit" disabled={readOnly || saving || !backendReady || !selectedProduct}>
                    {saving ? "Guardando..." : "Crear pedido"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={selectedOrder ? <Badge variant={badgeForOrderStatus(selectedOrder.orderStatus)}>{labelForOrderStatus(selectedOrder.orderStatus)}</Badge> : null}>
              <div>
                <CardTitle className="text-xl">Detalle del pedido</CardTitle>
                <CardDescription>Consulta items, total y cambia el estado operativo sin salir del panel.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {!selectedOrder ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm text-muted">
                  Selecciona un pedido del listado para ver su detalle.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailStat label="Cliente" value={selectedOrder.customerName} />
                    <DetailStat label="Telefono" value={selectedOrder.customerPhone} />
                    <DetailStat label="Total" value={formatCurrency(selectedOrder.total, selectedOrder.currency)} />
                    <DetailStat label="Creado" value={formatDate(selectedOrder.createdAt)} />
                  </div>

                  <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                    <p className="text-sm font-semibold">Items del pedido</p>
                    <div className="mt-3 space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-card/85 p-3">
                          <div>
                            <p className="font-medium">{item.nameSnapshot}</p>
                            <p className="mt-1 text-sm text-muted">
                              {item.quantity} x {formatCurrency(item.priceSnapshot, selectedOrder.currency)}
                              {item.productId ? " · Producto del catalogo" : ""}
                              {item.variant ? ` · ${item.variant}` : ""}
                            </p>
                          </div>
                          <p className="text-sm font-medium">
                            {formatCurrency(item.priceSnapshot * item.quantity, selectedOrder.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedOrder.notes ? (
                    <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                      <p className="text-sm font-semibold">Notas</p>
                      <p className="mt-2 text-sm leading-7 text-muted">{selectedOrder.notes}</p>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cambiar estado</label>
                    <div className="flex flex-wrap gap-2">
                      {ORDER_STATUS_OPTIONS.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={selectedOrder.orderStatus === status ? "primary" : "secondary"}
                          size="sm"
                          disabled={readOnly || statusUpdatingId === selectedOrder.id}
                          onClick={() => void changeOrderStatus(selectedOrder.id, status)}
                        >
                          {statusUpdatingId === selectedOrder.id && selectedOrder.orderStatus !== status
                            ? "Actualizando..."
                            : labelForOrderStatus(status)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {loadingDetailId ? <p className="text-xs text-muted">Cargando detalle...</p> : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function resolveProductStatus(product: CatalogProduct) {
  if (product.status) return product.status;
  return product.active === false ? "inactive" : "active";
}

function resolveProductPrice(product: CatalogProduct) {
  return Number(product.price || 0);
}

function resolveProductStock(product: CatalogProduct) {
  return Number((product.stock ?? product.stockQty) || 0);
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

function badgeForOrderStatus(status: string) {
  if (status === "delivered" || status === "ready") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  if (status === "preparing" || status === "paid") return "warning" as const;
  return "muted" as const;
}

function badgeForPaymentStatus(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "cancelled" || status === "refunded") return "danger" as const;
  return "warning" as const;
}

function labelForOrderStatus(status: string) {
  switch (status) {
    case "new":
      return "Nuevo";
    case "pending_payment":
      return "Pendiente de pago";
    case "paid":
      return "Pagado";
    case "preparing":
      return "Preparando";
    case "ready":
      return "Listo";
    case "delivered":
      return "Entregado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function labelForPaymentStatus(status: string) {
  switch (status) {
    case "unpaid":
      return "Sin pagar";
    case "pending":
      return "Pago pendiente";
    case "paid":
      return "Pago acreditado";
    case "refunded":
      return "Reintegrado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function formatCurrency(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
