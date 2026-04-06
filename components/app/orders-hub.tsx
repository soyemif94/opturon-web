"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Package, Receipt, ShoppingBag } from "lucide-react";
import type { PortalContact, PortalOrder, PortalOrderPaymentMetrics, PortalOrderPaymentMetricsRange, PortalPaymentDestination } from "@/lib/api";
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
  initialOrderId?: string;
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

type OrdersViewMode = "all" | "pending_validation";

const defaultPaymentMetrics: PortalOrderPaymentMetrics = {
  range: "last_7_days",
  pending: 0,
  approved: 0,
  rejected: 0
};

export function OrdersHub({ initialOrders, initialOrderId, readOnly = false, backendReady }: OrdersHubProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<PortalOrder | null>(
    initialOrders.find((order) => order.id === initialOrderId) || initialOrders[0] || null
  );
  const [viewMode, setViewMode] = useState<OrdersViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [metricsRange, setMetricsRange] = useState<PortalOrderPaymentMetricsRange>("last_7_days");
  const [paymentMetrics, setPaymentMetrics] = useState<PortalOrderPaymentMetrics>(defaultPaymentMetrics);
  const [form, setForm] = useState<OrderFormState>(initialForm);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [contacts, setContacts] = useState<PortalContact[]>([]);
  const [sellers, setSellers] = useState<AssignableSeller[]>([]);
  const [paymentDestinations, setPaymentDestinations] = useState<PortalPaymentDestination[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [destinationUpdatingId, setDestinationUpdatingId] = useState<string | null>(null);
  const [paymentValidationBusy, setPaymentValidationBusy] = useState<"approve" | "reject" | null>(null);
  const [detailPaymentDestinationId, setDetailPaymentDestinationId] = useState("");
  const [paymentRejectionReason, setPaymentRejectionReason] = useState("");
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
    const pendingValidation = orders.filter((order) => isPendingTransferValidation(order)).length;

    return {
      count: orders.length,
      totalRevenue,
      preparing,
      pending,
      pendingValidation
    };
  }, [orders]);

  const visibleOrders = useMemo(
    () => (viewMode === "pending_validation" ? orders.filter((order) => isPendingTransferValidation(order)) : orders),
    [orders, viewMode]
  );
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredOrders = useMemo(() => {
    if (!normalizedSearch) return visibleOrders;

    return visibleOrders.filter((order) => {
      const haystack = [
        order.id,
        order.customerName,
        order.customerPhone,
        order.contact?.name,
        order.contact?.phone,
        order.paymentStatus,
        order.orderStatus,
        order.paymentDestination?.name,
        order.paymentDestinationNameSnapshot
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, visibleOrders]);
  const selectedConversationHref = selectedOrder?.conversationPreview?.conversationId
    ? `/app/inbox/${selectedOrder.conversationPreview.conversationId}`
    : selectedOrder?.conversationId
      ? `/app/inbox/${selectedOrder.conversationId}`
      : null;

  async function loadPaymentMetrics(range: PortalOrderPaymentMetricsRange = metricsRange) {
    setMetricsLoading(true);
    try {
      const response = await fetch(`/api/app/orders/payment-metrics?range=${encodeURIComponent(range)}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.details || json?.error || "No se pudieron cargar las metricas de pagos.");
      }

      setPaymentMetrics({
        range,
        pending: Number(json?.pending || 0),
        approved: Number(json?.approved || 0),
        rejected: Number(json?.rejected || 0)
      });
    } finally {
      setMetricsLoading(false);
    }
  }

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
    void loadPaymentMetrics(metricsRange);
  }, [metricsRange]);

  useEffect(() => {
    setDetailPaymentDestinationId(selectedOrder?.paymentDestinationId || "");
    setPaymentRejectionReason(selectedOrder?.transferPayment?.rejectionReason || "");
  }, [selectedOrder?.id, selectedOrder?.paymentDestinationId]);

  async function reloadOrders(preferredOrderId?: string) {
    const response = await fetch("/api/app/orders", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.error || "No se pudo actualizar el listado de pedidos.");
    }

    const nextOrders = Array.isArray(json?.orders) ? (json.orders as PortalOrder[]) : [];
    setOrders(nextOrders);

    const preferredPool = viewMode === "pending_validation" ? nextOrders.filter((order) => isPendingTransferValidation(order)) : nextOrders;
    const preferredOrder =
      preferredPool.find((order) => order.id === preferredOrderId) ||
      preferredPool.find((order) => order.id === selectedOrder?.id) ||
      preferredPool[0] ||
      null;

    setSelectedOrder(preferredOrder);
    return nextOrders;
  }

  useEffect(() => {
    if (viewMode !== "pending_validation") {
      if (!selectedOrder && orders[0]) setSelectedOrder(orders.find((order) => order.id === initialOrderId) || orders[0]);
      return;
    }

    const nextVisible = orders.filter((order) => isPendingTransferValidation(order));
    if (!nextVisible.length) {
      if (selectedOrder && !isPendingTransferValidation(selectedOrder)) {
        setSelectedOrder(null);
      }
      return;
    }

    if (!selectedOrder || !isPendingTransferValidation(selectedOrder)) {
      setSelectedOrder(nextVisible[0]);
    }
  }, [initialOrderId, orders, selectedOrder, viewMode]);

  useEffect(() => {
    if (!initialOrderId) return;
    const matchingOrder = orders.find((order) => order.id === initialOrderId);
    if (!matchingOrder) return;
    if (selectedOrder?.id !== matchingOrder.id) {
      setSelectedOrder(matchingOrder);
    }
  }, [initialOrderId, orders, selectedOrder?.id]);

  useEffect(() => {
    if (!filteredOrders.length) {
      if (selectedOrder) setSelectedOrder(null);
      return;
    }

    if (!selectedOrder || !filteredOrders.some((order) => order.id === selectedOrder.id)) {
      setSelectedOrder(filteredOrders[0]);
    }
  }, [filteredOrders, selectedOrder]);

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

  async function validateTransferPayment(action: "approve" | "reject") {
    if (!selectedOrder?.transferPayment) return;

    setPaymentValidationBusy(action);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/orders/${selectedOrder.id}/payment-validation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? paymentRejectionReason.trim() || null : null
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(humanizeOrderError(json) || "No se pudo validar el comprobante.");
      }

      const updatedOrder = json.order as PortalOrder;
      const notificationOk = json.notification?.status === "sent" || json.notification?.ok === true;
      await Promise.all([reloadOrders(updatedOrder.id), loadPaymentMetrics(metricsRange)]);
      setSelectedOrder(updatedOrder);
      setPaymentRejectionReason(updatedOrder.transferPayment?.rejectionReason || "");
      setFeedback({
        tone: notificationOk ? "success" : "warning",
        text:
          action === "approve"
            ? notificationOk
              ? "Pago aprobado, pedido actualizado y cliente notificado."
              : "Pago aprobado y pedido actualizado, pero la notificacion saliente no pudo confirmarse."
            : notificationOk
              ? "Comprobante rechazado y cliente notificado para reenviar."
              : "Comprobante rechazado, pero la notificacion saliente no pudo confirmarse."
      });
    } catch (error) {
      setFeedback({
        tone: "danger",
        text: error instanceof Error ? error.message : "No se pudo validar el comprobante."
      });
    } finally {
      setPaymentValidationBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Pedidos registrados" value={String(stats.count)} helper="Pedidos internos visibles en el portal." />
        <MetricCard icon={Receipt} label="Facturacion potencial" value={formatCurrency(stats.totalRevenue)} helper="Total bruto de los pedidos registrados." />
        <MetricCard icon={ShoppingBag} label="Pendientes" value={String(stats.pending)} helper="Pedidos nuevos o esperando pago." />
        <MetricCard
          icon={Package}
          label="Pagos por validar"
          value={String(stats.pendingValidation)}
          helper="Comprobantes de transferencia pendientes de revision manual."
        />
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Metricas operativas de pagos</CardTitle>
            <CardDescription>Conteos simples del flujo de validacion manual por transferencia.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={metricsRange === "today" ? "primary" : "secondary"} onClick={() => setMetricsRange("today")}>
              Hoy
            </Button>
            <Button
              type="button"
              size="sm"
              variant={metricsRange === "last_7_days" ? "primary" : "secondary"}
              onClick={() => setMetricsRange("last_7_days")}
            >
              7 dias
            </Button>
            <Button
              type="button"
              size="sm"
              variant={metricsRange === "last_30_days" ? "primary" : "secondary"}
              onClick={() => setMetricsRange("last_30_days")}
            >
              30 dias
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={Package}
            label="Pendientes"
            value={metricsLoading ? "..." : String(paymentMetrics.pending)}
            helper="Basado en proofSubmittedAt."
          />
          <MetricCard
            icon={Receipt}
            label="Aprobados"
            value={metricsLoading ? "..." : String(paymentMetrics.approved)}
            helper="Basado en validatedAt."
          />
          <MetricCard
            icon={ShoppingBag}
            label="Rechazados"
            value={metricsLoading ? "..." : String(paymentMetrics.rejected)}
            helper="Basado en validatedAt."
          />
        </CardContent>
      </Card>

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
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={viewMode === "all" ? "primary" : "secondary"} onClick={() => setViewMode("all")}>
                  Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "pending_validation" ? "primary" : "secondary"}
                  onClick={() => setViewMode("pending_validation")}
                >
                  Pendientes de validacion
                </Button>
              </div>

              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por pedido, cliente o teléfono"
                aria-label="Buscar pedidos"
              />

              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-5 text-sm leading-7 text-muted">
                  {visibleOrders.length > 0 && normalizedSearch
                    ? "No encontramos pedidos para esa búsqueda."
                    : viewMode === "pending_validation"
                      ? "No hay comprobantes pendientes de validacion manual en este momento."
                      : "Todavia no hay pedidos cargados. Usa el formulario lateral para registrar el primero y dejar visible el flujo completo en el panel."}
                </div>
              ) : (
                filteredOrders.map((order) => (
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
                          {isPendingTransferValidation(order) ? (
                            <Badge variant={badgeForTransferValidation(order.transferPayment?.status)}>Pago por validar</Badge>
                          ) : null}
                          {order.customerType === "final_consumer" ? <Badge variant="muted">Consumidor final</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm text-muted">{labelForOrderPhone(order)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                          <span>{order.items.length} item(s)</span>
                          <span>·</span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                        {order.transferPayment ? (
                          <div className="mt-3 rounded-2xl border border-[color:var(--border)] bg-card/75 p-3 text-xs text-muted">
                            <p>
                              Comprobante: {labelForTransferValidation(order.transferPayment.status)}
                              {order.transferPayment.proofSubmittedAt ? ` · ${formatDate(order.transferPayment.proofSubmittedAt)}` : ""}
                            </p>
                            <p className="mt-1">
                              {order.transferPayment.proofMetadata?.type || "Sin tipo"}
                              {order.transferPayment.proofMetadata?.caption ? ` · ${order.transferPayment.proofMetadata.caption}` : ""}
                              {!order.transferPayment.proofMetadata?.caption && order.transferPayment.proofMetadata?.filename
                                ? ` · ${order.transferPayment.proofMetadata.filename}`
                                : ""}
                            </p>
                          </div>
                        ) : null}
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

                  {selectedOrder.conversationPreview ? (
                    <div className="space-y-3 rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Contexto de conversacion</p>
                          <p className="mt-1 text-sm text-muted">
                            Ultimos mensajes relevantes para entender rapido el caso antes de operar el cobro.
                          </p>
                        </div>
                        {selectedConversationHref ? (
                          <Button asChild type="button" variant="secondary" size="sm">
                            <Link href={selectedConversationHref}>Ver conversacion completa</Link>
                          </Button>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <DetailStat label="Conversacion" value={selectedOrder.conversationPreview.conversationId} />
                        <DetailStat
                          label="Estado"
                          value={labelForConversationState(
                            selectedOrder.conversationPreview.state,
                            selectedOrder.conversationPreview.stage
                          )}
                        />
                      </div>

                      {selectedOrder.conversationPreview.messages.length ? (
                        <div className="space-y-3">
                          {selectedOrder.conversationPreview.messages.map((message) => (
                            <div
                              key={message.id}
                              className="rounded-2xl border border-[color:var(--border)] bg-card/85 p-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium">
                                  {message.direction === "inbound" ? "Cliente" : "Bot / Equipo"}
                                </span>
                                <span className="text-xs text-muted">{formatDate(message.timestamp)}</span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap leading-6 text-muted">
                                {message.text || "(mensaje sin texto)"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-card/70 p-3 text-sm text-muted">
                          No encontramos mensajes recientes para previsualizar en este pedido.
                        </div>
                      )}
                    </div>
                  ) : selectedConversationHref ? (
                    <div className="space-y-3 rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                      <div>
                        <p className="text-sm font-semibold">Contexto de conversacion</p>
                        <p className="mt-1 text-sm text-muted">
                          Este pedido tiene una conversacion asociada, pero todavia no cargamos mensajes recientes.
                        </p>
                      </div>
                      <Button asChild type="button" variant="secondary" size="sm">
                        <Link href={selectedConversationHref}>Ver conversacion completa</Link>
                      </Button>
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

                  {selectedOrder.transferPayment ? (
                    <div className="space-y-3 rounded-[22px] border border-[color:var(--border)] bg-surface/55 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Validacion manual de transferencia</p>
                          <p className="mt-1 text-sm text-muted">
                            Usa esta accion para aprobar o rechazar el comprobante y notificar el resultado por WhatsApp.
                          </p>
                        </div>
                        <Badge variant={badgeForTransferValidation(selectedOrder.transferPayment.status)}>
                          {labelForTransferValidation(selectedOrder.transferPayment.status)}
                        </Badge>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <DetailStat label="Pedido asociado" value={selectedOrder.transferPayment.orderId || "Sin pedido"} />
                        <DetailStat label="Metodo" value={labelForTransferMethod(selectedOrder.transferPayment.paymentMethod)} />
                        <DetailStat
                          label="Comprobante recibido"
                          value={selectedOrder.transferPayment.proofSubmittedAt ? formatDate(selectedOrder.transferPayment.proofSubmittedAt) : "Sin fecha"}
                        />
                        <DetailStat
                          label="Archivo"
                          value={
                            selectedOrder.transferPayment.proofMetadata?.filename ||
                            selectedOrder.transferPayment.proofMetadata?.type ||
                            "Sin metadata"
                          }
                        />
                      </div>

                      {selectedOrder.transferPayment.proofMetadata?.caption ? (
                        <div className="rounded-2xl border border-[color:var(--border)] bg-card/85 p-3 text-sm text-muted">
                          Caption del comprobante: {selectedOrder.transferPayment.proofMetadata.caption}
                        </div>
                      ) : null}

                      {selectedOrder.transferPayment.validatedAt ? (
                        <div className="rounded-2xl border border-[color:var(--border)] bg-card/85 p-3 text-sm text-muted">
                          {selectedOrder.transferPayment.validationDecision === "approved" ? "Aprobado" : "Rechazado"} el{" "}
                          {formatDate(selectedOrder.transferPayment.validatedAt)}
                          {selectedOrder.transferPayment.validatedByName
                            ? ` por ${selectedOrder.transferPayment.validatedByName}`
                            : selectedOrder.transferPayment.validatedBy
                              ? ` por ${selectedOrder.transferPayment.validatedBy}`
                              : ""}
                          {selectedOrder.transferPayment.rejectionReason
                            ? ` · Motivo: ${selectedOrder.transferPayment.rejectionReason}`
                            : ""}
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Motivo de rechazo</label>
                        <Textarea
                          className="min-h-[88px]"
                          value={paymentRejectionReason}
                          onChange={(event) => setPaymentRejectionReason(event.target.value)}
                          placeholder="Opcional. Ej: el comprobante no coincide con el importe o la cuenta."
                          disabled={readOnly || paymentValidationBusy !== null}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={readOnly || paymentValidationBusy !== null}
                          onClick={() => void validateTransferPayment("approve")}
                        >
                          {paymentValidationBusy === "approve" ? "Aprobando..." : "Aprobar pago"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={readOnly || paymentValidationBusy !== null}
                          onClick={() => void validateTransferPayment("reject")}
                        >
                          {paymentValidationBusy === "reject" ? "Rechazando..." : "Rechazar comprobante"}
                        </Button>
                      </div>
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

function badgeForTransferValidation(status: string | null | undefined) {
  if (status === "payment_confirmed") return "success" as const;
  if (status === "payment_rejected") return "danger" as const;
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

function labelForTransferValidation(status: string | null | undefined) {
  switch (status) {
    case "payment_requested":
      return "Pago solicitado";
    case "payment_pending_validation":
      return "Pendiente de validacion";
    case "payment_confirmed":
      return "Pago validado";
    case "payment_rejected":
      return "Comprobante rechazado";
    default:
      return status || "Sin estado";
  }
}

function labelForTransferMethod(method: string | null | undefined) {
  if (method === "bank_transfer") return "Transferencia";
  if (method === "cash") return "Efectivo";
  return method || "Sin definir";
}

function isPendingTransferValidation(order: PortalOrder) {
  return (
    order.transferPayment?.status === "payment_pending_validation" &&
    order.transferPayment?.orderId === order.id &&
    Boolean(order.transferPayment?.proofSubmittedAt)
  );
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

function labelForConversationState(state: string | null | undefined, stage: string | null | undefined) {
  const safeState = String(state || "").trim();
  const safeStage = String(stage || "").trim();
  if (safeState && safeStage) return `${safeState} · ${safeStage}`;
  return safeState || safeStage || "Sin estado";
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
    case "invalid_payment_validation_action":
      return "La accion de validacion no es valida.";
    case "order_without_conversation":
      return "Este pedido no tiene una conversacion asociada para validar el comprobante.";
    case "transfer_payment_not_found":
      return "No encontramos un comprobante pendiente asociado a este pedido.";
    case "transfer_payment_already_confirmed":
      return "Este pago ya fue validado anteriormente.";
    default:
      return typeof payload.error === "string" ? payload.error : null;
  }
}
