"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Package, Receipt, ShoppingBag } from "lucide-react";
import type { PortalContact, PortalOrder, PortalPaymentDestination } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getStockState } from "@/lib/stock-state";

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

type AssignableSeller = {
  id: string;
  name: string;
  role: string | null;
};

type OrderFormState = {
  customerType: "registered_contact" | "final_consumer";
  contactId: string;
  sellerUserId: string;
  paymentDestinationId: string;
  notes: string;
  productId: string;
  quantity: string;
};

const initialForm: OrderFormState = {
  customerType: "registered_contact",
  contactId: "",
  sellerUserId: "",
  paymentDestinationId: "",
  notes: "",
  productId: "",
  quantity: "1"
};

export function OrdersHub({ initialOrders, readOnly = false, backendReady }: OrdersHubProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<PortalOrder | null>(initialOrders[0] || null);
  const [form, setForm] = useState<OrderFormState>(initialForm);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [contacts, setContacts] = useState<PortalContact[]>([]);
  const [sellers, setSellers] = useState<AssignableSeller[]>([]);
  const [paymentDestinations, setPaymentDestinations] = useState<PortalPaymentDestination[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [destinationUpdatingId, setDestinationUpdatingId] = useState<string | null>(null);
  const [detailPaymentDestinationId, setDetailPaymentDestinationId] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId) || null,
    [products, form.productId]
  );
  const selectedProductIsActive = selectedProduct ? resolveProductStatus(selectedProduct) === "active" : false;

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === form.contactId) || null,
    [contacts, form.contactId]
  );

  const visibleTotal = useMemo(() => {
    const quantity = Number.parseInt(form.quantity, 10);
    if (!selectedProduct || !Number.isInteger(quantity) || quantity <= 0) return 0;
    return Number((resolveProductPrice(selectedProduct) * quantity).toFixed(2));
  }, [form.quantity, selectedProduct]);
  const requestedQuantity = Number.parseInt(form.quantity, 10);
  const selectedProductStock = selectedProduct ? resolveProductStock(selectedProduct) : 0;
  const selectedProductPrice = selectedProduct ? resolveProductPrice(selectedProduct) : 0;
  const selectedStockState = getStockState(selectedProductStock);
  const hasInvalidQuantity = !Number.isInteger(requestedQuantity) || requestedQuantity <= 0;
  const hasInactiveProduct = Boolean(selectedProduct) && !selectedProductIsActive;
  const hasNoPrice = Boolean(selectedProduct) && selectedProductPrice <= 0;
  const hasNoStock = Boolean(selectedProduct) && selectedProductStock <= 0;
  const hasInsufficientStock =
    Boolean(selectedProduct) &&
    Number.isInteger(requestedQuantity) &&
    requestedQuantity > 0 &&
    requestedQuantity > selectedProductStock;
  const createBlockedByStock = hasInactiveProduct || hasNoPrice || hasNoStock || hasInsufficientStock;

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

  async function reloadProducts(preferredProductId?: string) {
    setProductsLoading(true);
    try {
      const response = await fetch("/api/app/catalog", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.details || json?.error || "No se pudo cargar el catalogo.");
      }

      const nextProducts = Array.isArray(json?.products) ? json.products : [];
      setProducts(nextProducts);
      setForm((current) => {
        const desiredId = preferredProductId || current.productId;
        const currentStillAvailable = desiredId && nextProducts.some((product: CatalogProduct) => product.id === desiredId);

        if (currentStillAvailable) {
          return { ...current, productId: desiredId };
        }

        const firstActive = nextProducts.find((product: CatalogProduct) => resolveProductStatus(product) === "active");
        return { ...current, productId: firstActive ? firstActive.id : nextProducts[0]?.id || "" };
      });
      return nextProducts;
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadContacts() {
    setContactsLoading(true);
    try {
      const response = await fetch("/api/app/contacts", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.details || json?.error || "No se pudo cargar la lista de clientes.");
      }

      const nextContacts = Array.isArray(json?.contacts) ? (json.contacts as PortalContact[]) : [];
      setContacts(nextContacts);
      setForm((current) => {
        if (!nextContacts.length) return { ...current, contactId: "" };
        if (current.contactId && nextContacts.some((contact) => contact.id === current.contactId)) return current;
        return { ...current, contactId: nextContacts[0]?.id || "" };
      });
      return nextContacts;
    } finally {
      setContactsLoading(false);
    }
  }

  async function loadOrderMeta() {
    setMetaLoading(true);
    try {
      const response = await fetch("/api/app/orders/meta", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.details || json?.error || "No se pudo cargar el equipo de ventas.");
      }

      const nextSellers = Array.isArray(json?.sellers) ? (json.sellers as AssignableSeller[]) : [];
      const nextPaymentDestinations = Array.isArray(json?.paymentDestinations)
        ? (json.paymentDestinations as PortalPaymentDestination[])
        : [];
      const currentUserId = typeof json?.currentUserId === "string" ? json.currentUserId : "";
      setSellers(nextSellers);
      setPaymentDestinations(nextPaymentDestinations);
      setForm((current) => {
        const defaultSellerId =
          (currentUserId && nextSellers.some((seller) => seller.id === currentUserId) ? currentUserId : "") || nextSellers[0]?.id || "";
        return {
          ...current,
          sellerUserId: current.sellerUserId && nextSellers.some((seller) => seller.id === current.sellerUserId)
            ? current.sellerUserId
            : defaultSellerId,
          paymentDestinationId:
            current.paymentDestinationId && nextPaymentDestinations.some((destination) => destination.id === current.paymentDestinationId)
              ? current.paymentDestinationId
              : ""
        };
      });
      return { nextSellers, nextPaymentDestinations };
    } finally {
      setMetaLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadDependencies() {
      try {
        await Promise.all([reloadProducts(), loadContacts(), loadOrderMeta()]);
      } catch (error) {
        if (!cancelled) {
          setFeedback({
            tone: "danger",
            text: error instanceof Error ? error.message : "No se pudo cargar la configuracion del formulario de pedidos."
          });
        }
      }
    }

    void loadDependencies();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDetailPaymentDestinationId(selectedOrder?.paymentDestinationId || "");
  }, [selectedOrder?.id, selectedOrder?.paymentDestinationId]);

  async function reloadOrders(preferredOrderId?: string) {
    const response = await fetch("/api/app/orders", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.error || "No se pudo actualizar el listado de pedidos.");
    }

    const nextOrders = Array.isArray(json?.orders) ? (json.orders as PortalOrder[]) : [];
    setOrders(nextOrders);

    const preferredOrder =
      nextOrders.find((order) => order.id === preferredOrderId) ||
      nextOrders.find((order) => order.id === selectedOrder?.id) ||
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

      const nextOrder = (json.order as PortalOrder) || null;
      setSelectedOrder(nextOrder);
      setDetailPaymentDestinationId(nextOrder?.paymentDestinationId || "");
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
    if (form.customerType === "registered_contact" && !form.contactId.trim()) {
      setFeedback({ tone: "warning", text: "Selecciona un cliente existente para registrar el pedido." });
      return;
    }
    if (!form.sellerUserId.trim()) {
      setFeedback({ tone: "warning", text: "Selecciona el vendedor responsable del pedido." });
      return;
    }
    if (!form.productId || !selectedProduct) {
      setFeedback({ tone: "warning", text: "Selecciona un producto del catalogo." });
      return;
    }
    if (!selectedProductIsActive) {
      setFeedback({ tone: "warning", text: "El producto seleccionado esta inactivo. Activalo en catalogo para usarlo en pedidos." });
      return;
    }
    if (selectedProductPrice <= 0) {
      setFeedback({
        tone: "warning",
        text: `El producto ${selectedProduct.name} no tiene un precio valido cargado en el catalogo.`
      });
      return;
    }
    if (!Number.isInteger(itemQuantity) || itemQuantity <= 0) {
      setFeedback({ tone: "warning", text: "La cantidad del producto debe ser mayor a cero." });
      return;
    }
    if (selectedProductStock <= 0) {
      setFeedback({ tone: "warning", text: "El producto seleccionado no tiene stock disponible." });
      return;
    }
    if (itemQuantity > selectedProductStock) {
      setFeedback({
        tone: "warning",
        text: `No hay stock suficiente para ${selectedProduct.name}. Disponible: ${selectedProductStock}.`
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/app/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerType: form.customerType,
          contactId: form.customerType === "registered_contact" ? form.contactId : null,
          sellerUserId: form.sellerUserId,
          paymentDestinationId: form.paymentDestinationId || null,
          source: "manual",
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
        throw new Error(humanizeOrderError(json) || "No se pudo crear el pedido.");
      }

      const createdOrder = (json?.order as PortalOrder | null) || null;
      await reloadOrders(createdOrder?.id || undefined);
      if (createdOrder?.id) {
        await loadOrderDetail(createdOrder.id);
      } else if (createdOrder) {
        setSelectedOrder(createdOrder);
      }
      await reloadProducts(form.productId);
      setForm((current) => ({
        ...initialForm,
        customerType: current.customerType,
        contactId: current.customerType === "registered_contact" ? current.contactId : "",
        sellerUserId: current.sellerUserId,
        paymentDestinationId: current.paymentDestinationId,
        productId: current.productId
      }));
      setFeedback({ tone: "success", text: "Pedido creado correctamente y detalle actualizado con datos reales." });
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
        body: JSON.stringify({
          orderStatus,
          paymentDestinationId: detailPaymentDestinationId || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(humanizeOrderError(json) || "No se pudo actualizar el estado del pedido.");
      }

      const updatedOrder = json.order as PortalOrder;
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setSelectedOrder((current) => (current?.id === updatedOrder.id ? updatedOrder : current));
      setDetailPaymentDestinationId(updatedOrder.paymentDestinationId || "");
      await reloadProducts(form.productId || updatedOrder.items.find((item) => item.productId)?.productId || undefined);
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

  async function saveOrderPaymentDestination() {
    if (!selectedOrder) return;

    setDestinationUpdatingId(selectedOrder.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentDestinationId: detailPaymentDestinationId || null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(humanizeOrderError(json) || "No se pudo actualizar el destino de cobro.");
      }

      const updatedOrder = json.order as PortalOrder;
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setSelectedOrder(updatedOrder);
      setDetailPaymentDestinationId(updatedOrder.paymentDestinationId || "");
      setFeedback({ tone: "success", text: "Destino de cobro actualizado." });
    } catch (error) {
      setFeedback({
        tone: "danger",
        text: error instanceof Error ? error.message : "No se pudo actualizar el destino de cobro."
      });
    } finally {
      setDestinationUpdatingId(null);
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
                          <p className="text-base font-semibold">{labelForOrderCustomer(order)}</p>
                          <Badge variant={badgeForOrderStatus(order.orderStatus)}>{labelForOrderStatus(order.orderStatus)}</Badge>
                          <Badge variant={badgeForPaymentStatus(order.paymentStatus)}>{labelForPaymentStatus(order.paymentStatus)}</Badge>
                          {order.customerType === "final_consumer" ? <Badge variant="muted">Consumidor final</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm text-muted">{labelForOrderPhone(order)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                          <span>{order.items.length} item(s)</span>
                          <span>·</span>
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
                <CardDescription>Selecciona un producto real del catalogo, define cliente y vendedor, y crea el pedido con detalle confiable.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <form className="space-y-4" onSubmit={createOrder}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de cliente</label>
                    <select
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={form.customerType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          customerType: event.target.value as OrderFormState["customerType"],
                          contactId: event.target.value === "registered_contact" ? current.contactId : ""
                        }))
                      }
                    >
                      <option value="registered_contact">Cliente existente</option>
                      <option value="final_consumer">Consumidor final</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vendedor responsable</label>
                    <select
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={form.sellerUserId}
                      onChange={(event) => setForm((current) => ({ ...current, sellerUserId: event.target.value }))}
                      disabled={metaLoading || sellers.length === 0}
                    >
                      <option value="">{metaLoading ? "Cargando equipo..." : "Selecciona un vendedor"}</option>
                      {sellers.map((seller) => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name}{seller.role ? ` · ${labelForSellerRole(seller.role)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Destino de cobro</label>
                    <select
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={form.paymentDestinationId}
                      onChange={(event) => setForm((current) => ({ ...current, paymentDestinationId: event.target.value }))}
                      disabled={metaLoading}
                    >
                      <option value="">Sin definir por ahora</option>
                      {paymentDestinations.map((destination) => (
                        <option key={destination.id} value={destination.id}>
                          {destination.name}{` · ${labelForPaymentDestinationType(destination.type)}`}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-muted">
                      En esta fase puede quedar vacio si el pedido todavia no esta cobrado. Si ya sabes a donde entra la plata, dejalo imputado ahora.
                    </p>
                  </div>
                </div>

                {form.customerType === "registered_contact" ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cliente existente</label>
                    <select
                      className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                      value={form.contactId}
                      onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
                      disabled={contactsLoading || contacts.length === 0}
                    >
                      <option value="">{contactsLoading ? "Cargando clientes..." : "Selecciona un cliente"}</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name}{contact.phone ? ` · ${contact.phone}` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-muted">
                      {selectedContact
                        ? "El pedido tomará el nombre y teléfono del contacto seleccionado."
                        : "El pedido quedará vinculado a un contacto real del workspace."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-[color:var(--border)] bg-surface/45 p-4 text-sm leading-7 text-muted">
                    El pedido se registrará como <span className="font-medium text-text">Consumidor final</span> sin exigir nombre ni teléfono.
                  </div>
                )}

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
                        disabled={productsLoading || products.length === 0}
                      >
                        <option value="">{productsLoading ? "Cargando catalogo..." : "Selecciona un producto"}</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}{product.sku ? ` · ${product.sku}` : ""}{resolveProductStatus(product) === "active" ? "" : " · Inactivo"}
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
                  {selectedProduct ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant={selectedStockState.variant}>{selectedStockState.label}</Badge>
                      {selectedStockState.isLowStock ? (
                        <span className="text-sm text-amber-300">Quedan pocas unidades disponibles.</span>
                      ) : null}
                      {selectedStockState.isOutOfStock ? (
                        <span className="text-sm text-red-300">Este producto no tiene stock disponible.</span>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedProduct && createBlockedByStock ? (
                    <p className="mt-3 text-sm text-amber-300">
                      {hasInactiveProduct
                        ? "Este producto esta inactivo en catalogo y no se puede usar para registrar pedidos."
                        : hasNoPrice
                        ? "Este producto no tiene un precio valido cargado en este momento."
                        : hasNoStock
                        ? "Este producto no tiene stock disponible en este momento."
                        : `La cantidad solicitada supera el stock disponible (${selectedProductStock}).`}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted">
                    Fase 4: el pedido valida stock real, descuenta inventario al crearse y lo repone solo si el pedido se cancela.
                  </p>
                  <Button
                    type="submit"
                    disabled={
                      readOnly ||
                      saving ||
                      !backendReady ||
                      !selectedProduct ||
                      hasInvalidQuantity ||
                      createBlockedByStock ||
                      !form.sellerUserId ||
                      (form.customerType === "registered_contact" && !form.contactId)
                    }
                  >
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
                    <DetailStat label="Cliente" value={labelForOrderCustomer(selectedOrder)} />
                    <DetailStat label="Telefono" value={labelForOrderPhone(selectedOrder)} />
                    <DetailStat label="Tipo de cliente" value={labelForCustomerType(selectedOrder.customerType)} />
                    <DetailStat label="Vendedor" value={labelForOrderSeller(selectedOrder)} />
                    <DetailStat label="Destino de cobro" value={labelForPaymentDestination(selectedOrder)} />
                    <DetailStat label="Origen" value={labelForOrderSource(selectedOrder)} />
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

                  <div className="space-y-3 rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                    <div>
                      <p className="text-sm font-semibold">Destino del cobro</p>
                      <p className="mt-1 text-sm text-muted">Puedes imputarlo manualmente desde este detalle antes o al momento de marcar el pedido como pagado.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Destino</label>
                        <select
                          className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                          value={detailPaymentDestinationId}
                          onChange={(event) => setDetailPaymentDestinationId(event.target.value)}
                          disabled={metaLoading || readOnly || !backendReady || destinationUpdatingId === selectedOrder.id}
                        >
                          <option value="">Sin definir</option>
                          {paymentDestinations.map((destination) => (
                            <option key={destination.id} value={destination.id}>
                              {destination.name}{` · ${labelForPaymentDestinationType(destination.type)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={readOnly || !backendReady || destinationUpdatingId === selectedOrder.id}
                        onClick={() => void saveOrderPaymentDestination()}
                      >
                        {destinationUpdatingId === selectedOrder.id ? "Guardando..." : "Guardar destino"}
                      </Button>
                    </div>
                  </div>

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

function labelForCustomerType(type: string | null | undefined) {
  return type === "final_consumer" ? "Consumidor final" : "Cliente existente";
}

function labelForOrderCustomer(order: PortalOrder) {
  return order.customerType === "final_consumer" ? "Consumidor final" : order.customerName || order.contact?.name || "Cliente sin nombre";
}

function labelForOrderPhone(order: PortalOrder) {
  return order.customerPhone || order.contact?.phone || (order.customerType === "final_consumer" ? "No informado" : "Sin telefono");
}

function labelForSellerRole(role: string | null | undefined) {
  switch (role) {
    case "seller":
      return "vendedor";
    default:
      return role || "equipo";
  }
}

function labelForOrderSeller(order: PortalOrder) {
  if (order.source === "bot" && !order.seller?.name && !order.sellerNameSnapshot) {
    return "Bot";
  }
  return order.seller?.name || order.sellerNameSnapshot || "Sin asignar";
}

function labelForOrderSource(order: PortalOrder) {
  if (order.source === "bot") return "Bot";
  if (order.source === "manual") return "Panel";
  if (order.source === "automation") return "Automatizacion";
  if (order.source === "inbox") return "Inbox";
  if (order.source === "api") return "API";
  return order.source || "Sin definir";
}

function labelForPaymentDestinationType(type: string | null | undefined) {
  switch (type) {
    case "bank":
      return "Banco";
    case "wallet":
      return "Billetera";
    case "cash_box":
      return "Caja";
    case "other":
      return "Otro";
    default:
      return "Sin tipo";
  }
}

function labelForPaymentDestination(order: PortalOrder) {
  const name = order.paymentDestination?.name || order.paymentDestinationNameSnapshot;
  const type = order.paymentDestination?.type || order.paymentDestinationTypeSnapshot;
  if (!name) return "Sin definir";
  return `${name}${type ? ` · ${labelForPaymentDestinationType(type)}` : ""}`;
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

function humanizeOrderError(payload: any) {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.details === "string" && payload.details.trim()) {
    return payload.details;
  }

  switch (payload.error) {
    case "missing_contact_id":
      return "Selecciona un cliente existente para registrar el pedido.";
    case "missing_seller_user_id":
      return "Selecciona el vendedor responsable del pedido.";
    case "seller_user_not_found":
      return "El vendedor seleccionado ya no esta disponible.";
    case "payment_destination_not_found":
      return "El destino de cobro seleccionado ya no existe.";
    case "payment_destination_inactive":
      return "El destino de cobro seleccionado esta inactivo.";
    case "missing_payment_destination_for_paid_order":
      return "Define un destino de cobro antes de marcar el pedido como pagado.";
    case "invalid_order_payment_amount":
      return "El total del pedido no es valido para registrar el cobro.";
    case "order_item_insufficient_stock":
      return "No hay stock suficiente para el producto seleccionado.";
    case "order_item_product_inactive":
    case "order_item_product_archived":
      return "El producto seleccionado esta inactivo.";
    case "order_item_product_not_found":
      return "El producto seleccionado ya no existe.";
    default:
      return typeof payload.error === "string" ? payload.error : null;
  }
}
