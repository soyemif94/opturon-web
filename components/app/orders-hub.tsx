"use client";

import { type ComponentType, type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  CreditCard,
  Package,
  Receipt,
} from "lucide-react";
import type {
  PortalContact,
  PortalOrder,
  PortalOrderPaymentMetrics,
  PortalOrderPaymentMetricsRange,
  PortalPaymentDestination
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { getStockState } from "@/lib/stock-state";

const ORDER_STATUS_OPTIONS = ["new", "pending_payment", "paid", "preparing", "ready", "delivered", "cancelled"] as const;

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

type OrdersViewMode = "all" | "pending_validation";

const defaultPaymentMetrics: PortalOrderPaymentMetrics = {
  range: "last_7_days",
  pending: 0,
  approved: 0,
  rejected: 0
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

function hydrateOrderSeller(order: PortalOrder, sellers: AssignableSeller[]): PortalOrder {
  const seller = order.sellerUserId ? sellers.find((item) => item.id === order.sellerUserId) || null : null;
  if (!seller) return order;
  return {
    ...order,
    sellerNameSnapshot: order.sellerNameSnapshot || seller.name,
    seller: order.seller?.name
      ? order.seller
      : {
          id: seller.id,
          name: seller.name,
          role: seller.role
        }
  };
}

export function OrdersHub({ initialOrders, initialOrderId, readOnly = false, backendReady }: OrdersHubProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<PortalOrder | null>(
    initialOrders.find((order) => order.id === initialOrderId) || initialOrders[0] || null
  );
  const [viewMode, setViewMode] = useState<OrdersViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [listTab, setListTab] = useState<"all" | "pending" | "delivered" | "cancelled">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
  const [sellerUpdatingId, setSellerUpdatingId] = useState<string | null>(null);
  const [paymentValidationBusy, setPaymentValidationBusy] = useState<"approve" | "reject" | null>(null);
  const [detailPaymentDestinationId, setDetailPaymentDestinationId] = useState("");
  const [detailSellerUserId, setDetailSellerUserId] = useState("");
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

  const monthSummary = useMemo(() => {
    const now = new Date();
    const monthlyOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    });

    return {
      count: monthlyOrders.length,
      revenue: monthlyOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    };
  }, [orders]);

  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => !["delivered", "cancelled"].includes(order.orderStatus)).length,
    [orders]
  );
  const cancelledOrdersCount = useMemo(() => orders.filter((order) => order.orderStatus === "cancelled").length, [orders]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredOrders = useMemo(() => {
    const candidateOrders = orders.filter((order) => {
      if (viewMode === "pending_validation" && !isPendingTransferValidation(order)) return false;
      if (listTab === "pending" && ["delivered", "cancelled"].includes(order.orderStatus)) return false;
      if (listTab === "delivered" && !["ready", "delivered"].includes(order.orderStatus)) return false;
      if (listTab === "cancelled" && order.orderStatus !== "cancelled") return false;
      if (statusFilter !== "all" && order.orderStatus !== statusFilter) return false;
      if (sourceFilter !== "all" && (order.source || "manual") !== sourceFilter) return false;
      if (sellerFilter !== "all" && (order.sellerUserId || "unassigned") !== sellerFilter) return false;

      const createdAt = new Date(order.createdAt);
      if (dateFrom) {
        const start = new Date(`${dateFrom}T00:00:00`);
        if (createdAt < start) return false;
      }
      if (dateTo) {
        const end = new Date(`${dateTo}T23:59:59`);
        if (createdAt > end) return false;
      }

      if (!normalizedSearch) return true;

      const haystack = [
        order.id,
        order.customerName,
        order.customerPhone,
        order.contact?.name,
        order.contact?.phone,
        order.paymentStatus,
        order.orderStatus,
        order.paymentDestination?.name,
        order.paymentDestinationNameSnapshot,
        labelForOrderSeller(order),
        order.items.map((item) => item.nameSnapshot).join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    return candidateOrders.slice().sort((left, right) => compareOrdersForDisplay(left, right));
  }, [dateFrom, dateTo, listTab, normalizedSearch, orders, sellerFilter, sourceFilter, statusFilter, viewMode]);

  const sourceOptions = useMemo(
    () => Array.from(new Set(orders.map((order) => order.source || "manual"))).sort((left, right) => left.localeCompare(right)),
    [orders]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(orders.map((order) => order.orderStatus))).sort((left, right) => left.localeCompare(right)),
    [orders]
  );
  const tabCounts = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter((order) => !["delivered", "cancelled"].includes(order.orderStatus)).length,
      delivered: orders.filter((order) => ["ready", "delivered"].includes(order.orderStatus)).length,
      cancelled: orders.filter((order) => order.orderStatus === "cancelled").length
    }),
    [orders]
  );
  const trendSeries = useMemo(() => {
    const days = 30;
    const buckets = new Map<string, { label: string; orders: number; revenue: number }>();

    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, {
        label: new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date).replace(".", ""),
        orders: 0,
        revenue: 0
      });
    }

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.orders += 1;
      bucket.revenue += Number(order.total || 0);
    });

    return Array.from(buckets.values());
  }, [orders]);
  const statusBreakdown = useMemo(() => {
    const delivered = orders.filter((order) => order.orderStatus === "delivered").length;
    const pending = pendingOrdersCount;
    const cancelled = cancelledOrdersCount;
    const total = Math.max(delivered + pending + cancelled, 1);

    return {
      total: orders.length,
      items: [
        { label: "Entregados", value: delivered, color: "#22c55e", share: delivered / total },
        { label: "Pendientes", value: pending, color: "#f59e0b", share: pending / total },
        { label: "Cancelados", value: cancelled, color: "#ef4444", share: cancelled / total }
      ]
    };
  }, [cancelledOrdersCount, orders.length, pendingOrdersCount]);
  const sourceBreakdown = useMemo(() => buildDistribution(orders, (order) => labelForOrderSource(order.source), (order) => 1), [orders]);
  const paymentBreakdown = useMemo(
    () => buildDistribution(orders, (order) => labelForOrderPaymentMethod(order), (order) => Number(order.total || 0)),
    [orders]
  );
  const topProducts = useMemo(
    () =>
      buildDistribution(
        orders.flatMap((order) => order.items.map((item) => ({ item }))),
        (entry) => entry.item.nameSnapshot || "Producto sin nombre",
        (entry) => Number(entry.item.quantity || 0)
      ),
    [orders]
  );
  const attentionOrders = useMemo(
    () =>
      orders
        .filter((order) => needsAttention(order))
        .slice()
        .sort((left, right) => compareOrdersForDisplay(left, right))
        .slice(0, 4),
    [orders]
  );
  const selectedOrderUnits = useMemo(
    () => selectedOrder?.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0,
    [selectedOrder]
  );
  const selectedOrderActionLabel = useMemo(() => {
    if (!selectedOrder) return "Selecciona un pedido";
    return labelForOrderAction(selectedOrder);
  }, [selectedOrder]);

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
          sellerUserId:
            current.sellerUserId && nextSellers.some((seller) => seller.id === current.sellerUserId)
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
    setDetailSellerUserId(selectedOrder?.sellerUserId || "");
    setPaymentRejectionReason(selectedOrder?.transferPayment?.rejectionReason || "");
  }, [selectedOrder?.id, selectedOrder?.paymentDestinationId, selectedOrder?.sellerUserId, selectedOrder?.transferPayment?.rejectionReason]);

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

  useEffect(() => {
    if (!selectedOrder && orders[0]) {
      setSelectedOrder(orders.find((order) => order.id === initialOrderId) || orders[0]);
    }
  }, [initialOrderId, orders, selectedOrder]);

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

  function focusDetail(scroll = false) {
    if (!scroll) return;
    document.getElementById("order-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function selectOrder(orderId: string, scroll = false) {
    await loadOrderDetail(orderId);
    focusDetail(scroll);
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
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
          items: [{ productId: form.productId, quantity: itemQuantity }]
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
      focusDetail(true);
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

      const updatedOrder = hydrateOrderSeller(json.order as PortalOrder, sellers);
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

  async function saveOrderSeller() {
    if (!selectedOrder) return;
    if (!detailSellerUserId.trim()) {
      setFeedback({ tone: "warning", text: "Selecciona el vendedor responsable del pedido." });
      return;
    }

    setSellerUpdatingId(selectedOrder.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/app/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerUserId: detailSellerUserId
        })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(humanizeOrderError(json) || "No se pudo actualizar el vendedor del pedido.");
      }

      const updatedOrder = json.order as PortalOrder;
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setSelectedOrder(updatedOrder);
      setDetailSellerUserId(updatedOrder.sellerUserId || "");
      setFeedback({ tone: "success", text: "Vendedor del pedido actualizado." });
    } catch (error) {
      setFeedback({
        tone: "danger",
        text: error instanceof Error ? error.message : "No se pudo actualizar el vendedor del pedido."
      });
    } finally {
      setSellerUpdatingId(null);
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={ClipboardList}
          label="Pedidos del mes"
          value={String(monthSummary.count)}
          helper="Pedidos creados en el mes actual con datos reales del tenant."
          accent="from-brand/30 via-brandBright/12 to-transparent"
        />
        <MetricCard
          icon={Receipt}
          label="Facturacion del mes"
          value={formatCurrency(monthSummary.revenue)}
          helper="Facturacion visible desde pedidos del mes en la moneda actual."
          accent="from-sky-500/28 via-sky-400/10 to-transparent"
        />
        <MetricCard
          icon={Package}
          label="Pedidos entregados"
          value={String(orders.filter((order) => order.orderStatus === "delivered").length)}
          helper="Pedidos ya cerrados con entrega registrada."
          accent="from-emerald-500/28 via-emerald-400/10 to-transparent"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Pendientes"
          value={String(pendingOrdersCount)}
          helper="Pedidos abiertos que aun requieren cobro, preparacion o entrega."
          accent="from-amber-500/28 via-amber-400/10 to-transparent"
        />
        <MetricCard
          icon={CreditCard}
          label="Cancelados"
          value={String(cancelledOrdersCount)}
          helper="Pedidos fuera del circuito activo."
          accent="from-rose-500/24 via-rose-400/10 to-transparent"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_320px]">
        <div className="space-y-6">
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
            <Card className="border-white/6 bg-card/90">
              <CardHeader action={<Badge variant="muted">Mes actual</Badge>}>
                <div>
                  <CardTitle className="text-xl">Evolucion de pedidos</CardTitle>
                  <CardDescription>Lectura de pedidos y facturacion usando solo actividad real de los ultimos 30 dias.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <OrdersTrendChart series={trendSeries} />
              </CardContent>
            </Card>

            <Card className="border-white/6 bg-card/90">
              <CardHeader action={<Badge variant="warning">Resumen operativo</Badge>}>
                <div>
                  <CardTitle className="text-xl">Estado de pedidos</CardTitle>
                  <CardDescription>Entrega, pendientes y cancelaciones visibles de un vistazo.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <OrderStatusRing total={statusBreakdown.total} items={statusBreakdown.items} />
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-100">
                  {attentionOrders.length > 0
                    ? `${attentionOrders.length} pedidos requieren atencion inmediata.`
                    : "La operacion no tiene alertas criticas en este momento."}
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="border-white/6 bg-card/90">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">Buscar pedidos</CardTitle>
                <CardDescription>Busca por numero, cliente, producto o referencia y filtra sin salir del panel.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por numero, cliente, producto o referencia..."
                  aria-label="Buscar pedidos"
                />
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {labelForOrderStatus(status)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  <option value="all">Todos los canales</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {labelForOrderSource(source)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                  value={sellerFilter}
                  onChange={(event) => setSellerFilter(event.target.value)}
                >
                  <option value="all">Todos los vendedores</option>
                  <option value="unassigned">Sin asignar</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Fecha desde" />
                  <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Fecha hasta" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={viewMode === "all" ? "secondary" : "ghost"} onClick={() => setViewMode("all")}>
                    Operacion completa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "pending_validation" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("pending_validation")}
                  >
                    Validacion manual
                  </Button>
                </div>
                <Badge variant="muted">{filteredOrders.length} visibles</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={listTab === "all" ? "primary" : "secondary"} onClick={() => setListTab("all")}>
                  Todos los pedidos
                  <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{tabCounts.all}</span>
                </Button>
                <Button type="button" size="sm" variant={listTab === "pending" ? "primary" : "secondary"} onClick={() => setListTab("pending")}>
                  Pendientes
                  <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{tabCounts.pending}</span>
                </Button>
                <Button type="button" size="sm" variant={listTab === "delivered" ? "primary" : "secondary"} onClick={() => setListTab("delivered")}>
                  Entregados
                  <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{tabCounts.delivered}</span>
                </Button>
                <Button type="button" size="sm" variant={listTab === "cancelled" ? "primary" : "secondary"} onClick={() => setListTab("cancelled")}>
                  Cancelados
                  <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-[11px]">{tabCounts.cancelled}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/6 bg-card/90">
            <CardHeader action={<Badge variant={readOnly ? "warning" : "success"}>{readOnly ? "Solo lectura" : "Operativo"}</Badge>}>
              <div>
                <CardTitle className="text-xl">Listado de pedidos</CardTitle>
                <CardDescription>Mostrando {filteredOrders.length} de {orders.length} pedidos reales.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredOrders.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[color:var(--border)] bg-surface/45 p-6 text-sm leading-7 text-muted">
                  {normalizedSearch || statusFilter !== "all" || sourceFilter !== "all" || sellerFilter !== "all" || dateFrom || dateTo
                    ? "No encontramos pedidos para ese criterio."
                    : viewMode === "pending_validation"
                      ? "No hay comprobantes pendientes de validacion manual."
                      : "Todavia no hay pedidos para mostrar en este listado."}
                </div>
              ) : (
                <>
                  <div className="hidden xl:block overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-surface/45">
                    <table className="w-full table-fixed text-sm">
                      <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-[0.16em] text-muted">
                        <tr>
                          <th className="px-4 py-3 font-medium">N pedido</th>
                          <th className="px-4 py-3 font-medium">Cliente</th>
                          <th className="px-4 py-3 font-medium">Fecha</th>
                          <th className="px-4 py-3 font-medium">Estado</th>
                          <th className="px-4 py-3 font-medium">Total</th>
                          <th className="px-4 py-3 font-medium">Pago</th>
                          <th className="px-4 py-3 font-medium">Entrega</th>
                          <th className="px-4 py-3 font-medium text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className={cn("border-t border-[color:var(--border)]", selectedOrder?.id === order.id ? "bg-brand/6" : "bg-transparent")}>
                            <td className="px-4 py-3 align-top">
                              <p className="font-semibold text-brandBright">{shortOrderId(order.id)}</p>
                              <p className="mt-1 text-xs text-muted">{labelForOrderSource(order.source)}</p>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <p className="font-medium text-text">{labelForOrderCustomer(order)}</p>
                              <p className="mt-1 text-xs text-muted">{labelForOrderPhone(order)}</p>
                            </td>
                            <td className="px-4 py-3 align-top text-muted">{formatDateCompact(order.createdAt)}</td>
                            <td className="px-4 py-3 align-top">
                              <Badge variant={badgeForOrderStatus(order.orderStatus)}>{labelForOrderStatus(order.orderStatus)}</Badge>
                            </td>
                            <td className="px-4 py-3 align-top font-medium text-text">{formatCurrency(order.total, order.currency)}</td>
                            <td className="px-4 py-3 align-top">
                              <Badge variant={badgeForPaymentStatus(order.paymentStatus)}>{labelForPaymentStatus(order.paymentStatus)}</Badge>
                            </td>
                            <td className="px-4 py-3 align-top text-muted">
                              <p>{labelForDeliveryState(order)}</p>
                              <p className="mt-1 text-xs">{labelForOrderSeller(order, sellers)}</p>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex justify-end gap-2">
                                <Button type="button" size="sm" className="rounded-2xl" onClick={() => void selectOrder(order.id, true)}>
                                  Ver pedido
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 xl:hidden">
                    {filteredOrders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => void selectOrder(order.id, true)}
                        className={cn(
                          "w-full rounded-[24px] border p-4 text-left transition-colors",
                          selectedOrder?.id === order.id
                            ? "border-brand/35 bg-[linear-gradient(180deg,rgba(255,128,0,0.08),rgba(10,17,30,0.34))]"
                            : "border-[color:var(--border)] bg-surface/50 hover:bg-surface/70"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-brandBright">{shortOrderId(order.id)}</p>
                            <p className="mt-2 text-base font-medium text-text">{labelForOrderCustomer(order)}</p>
                            <p className="mt-1 text-sm text-muted">{formatDateCompact(order.createdAt)}</p>
                          </div>
                          <p className="text-sm font-semibold text-text">{formatCurrency(order.total, order.currency)}</p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant={badgeForOrderStatus(order.orderStatus)}>{labelForOrderStatus(order.orderStatus)}</Badge>
                          <Badge variant={badgeForPaymentStatus(order.paymentStatus)}>{labelForPaymentStatus(order.paymentStatus)}</Badge>
                          <Badge variant="outline">{labelForOrderSeller(order, sellers)}</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {loadingDetailId ? <p className="mt-3 text-xs text-muted">Cargando detalle seleccionado...</p> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <SidebarCard badge="Atajos rapidos" title="Acciones utiles" description="Accede rapido a lo que mas se usa en la operacion diaria.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {!readOnly ? (
                <Button asChild className="justify-start rounded-2xl">
                  <a href="#new-order">Nuevo pedido</a>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="justify-start rounded-2xl"
                onClick={() => {
                  setViewMode("pending_validation");
                  setListTab("all");
                }}
              >
                Validar pagos
              </Button>
              <Button type="button" variant="secondary" className="justify-start rounded-2xl" onClick={() => setListTab("pending")}>
                Pedidos pendientes
              </Button>
              <Button type="button" variant="secondary" className="justify-start rounded-2xl" onClick={() => setListTab("delivered")}>
                Pedidos entregados
              </Button>
            </div>
          </SidebarCard>

          <SidebarCard badge="Resumen del dia" title="Canales de origen" description="De donde llegan los pedidos que hoy alimentan la operacion.">
            <ProgressList
              items={sourceBreakdown}
              emptyLabel="Todavia no hay canales suficientes para mostrar un ranking."
              valueFormatter={(value) => `${value} pedido(s)`}
            />
          </SidebarCard>

          <SidebarCard badge="Cobros" title="Metodos de pago" description="Distribucion real usando el metodo o destino de cobro disponible en cada pedido.">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={metricsRange === "today" ? "primary" : "secondary"} onClick={() => setMetricsRange("today")}>
                Dia
              </Button>
              <Button
                type="button"
                size="sm"
                variant={metricsRange === "last_7_days" ? "primary" : "secondary"}
                onClick={() => setMetricsRange("last_7_days")}
              >
                Semana
              </Button>
              <Button
                type="button"
                size="sm"
                variant={metricsRange === "last_30_days" ? "primary" : "secondary"}
                onClick={() => setMetricsRange("last_30_days")}
              >
                Mes
              </Button>
            </div>
            <ProgressList
              items={paymentBreakdown}
              emptyLabel="Aun no hay datos suficientes para desglosar los metodos de pago."
              valueFormatter={(value) => formatCurrency(value)}
            />
            <div className="mt-4 grid gap-3">
              <DetailStat label="Pendientes" value={metricsLoading ? "..." : String(paymentMetrics.pending)} />
              <DetailStat label="Aprobados" value={metricsLoading ? "..." : String(paymentMetrics.approved)} />
              <DetailStat label="Rechazados" value={metricsLoading ? "..." : String(paymentMetrics.rejected)} />
            </div>
          </SidebarCard>

          <SidebarCard badge="Catalogo" title="Top productos pedidos" description="Productos con mas salida por cantidad pedida en los pedidos reales cargados.">
            <ProgressList
              items={topProducts}
              emptyLabel="Aun no hay productos suficientes para construir el ranking."
              valueFormatter={(value) => `${value} unidad(es)`}
            />
          </SidebarCard>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Card id="order-detail" className="border-white/6 bg-card/90">
          <CardHeader action={selectedOrder ? <Badge variant={badgeForOrderStatus(selectedOrder.orderStatus)}>{labelForOrderStatus(selectedOrder.orderStatus)}</Badge> : null}>
            <div>
              <CardTitle className="text-xl">Detalle del pedido</CardTitle>
              <CardDescription>Productos, cantidades, responsables y cobro claros sin dominar la pantalla principal.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {!selectedOrder ? (
              <div className="rounded-[24px] border border-dashed border-[color:var(--border)] bg-surface/45 p-6 text-sm text-muted">
                Selecciona un pedido de la mesa principal para ver su detalle.
              </div>
            ) : (
              <>
                <div className="rounded-[26px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,128,0,0.05))] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted">Pedido seleccionado</p>
                      <h3 className="mt-3 text-2xl font-semibold text-text">{labelForOrderCustomer(selectedOrder)}</h3>
                      <p className="mt-2 text-sm text-muted">{selectedOrder.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={badgeForOrderStatus(selectedOrder.orderStatus)}>{labelForOrderStatus(selectedOrder.orderStatus)}</Badge>
                      <Badge variant={badgeForPaymentStatus(selectedOrder.paymentStatus)}>{labelForPaymentStatus(selectedOrder.paymentStatus)}</Badge>
                      {selectedOrder.transferPayment ? (
                        <Badge variant={badgeForTransferValidation(selectedOrder.transferPayment.status)}>
                          {labelForTransferValidation(selectedOrder.transferPayment.status)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <DetailStat label="Total" value={formatCurrency(selectedOrder.total, selectedOrder.currency)} />
                    <DetailStat label="Productos" value={`${selectedOrderUnits} unidad(es)`} />
                    <DetailStat label="Responsable" value={labelForOrderSeller(selectedOrder, sellers)} />
                    <DetailStat label="Siguiente accion" value={selectedOrderActionLabel} />
                  </div>
                </div>

                <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">Productos del pedido</p>
                      <p className="mt-1 text-sm text-muted">Cantidades, subtotales y composicion comercial del pedido.</p>
                    </div>
                    <Badge variant="muted">{selectedOrder.items.length} linea(s)</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-card/85 p-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-medium text-text">{item.nameSnapshot}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
                            <span>Cantidad: {item.quantity}</span>
                            <span>Precio: {formatCurrency(item.priceSnapshot, selectedOrder.currency)}</span>
                            {item.variant ? <span>{item.variant}</span> : null}
                            {item.skuSnapshot ? <span>{item.skuSnapshot}</span> : null}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface/50 px-4 py-3 text-right">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Subtotal</p>
                          <p className="mt-2 text-sm font-semibold text-text">
                            {formatCurrency(item.priceSnapshot * item.quantity, selectedOrder.currency)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.notes ? (
                  <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                    <p className="text-sm font-semibold text-text">Notas del pedido</p>
                    <p className="mt-2 text-sm leading-7 text-muted">{selectedOrder.notes}</p>
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3 rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                    <div>
                      <p className="text-sm font-semibold text-text">Vendedor asignado</p>
                      <p className="mt-1 text-sm text-muted">Mantiene al responsable visible para operacion y seguimiento comercial.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Vendedor</label>
                        <select
                          className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
                          value={detailSellerUserId}
                          onChange={(event) => setDetailSellerUserId(event.target.value)}
                          disabled={metaLoading || readOnly || !backendReady || sellerUpdatingId === selectedOrder.id || sellers.length === 0}
                        >
                          <option value="">{metaLoading ? "Cargando vendedores..." : "Selecciona un vendedor"}</option>
                          {sellers.map((seller) => (
                            <option key={seller.id} value={seller.id}>
                              {seller.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-2xl"
                        disabled={readOnly || !backendReady || sellerUpdatingId === selectedOrder.id || !detailSellerUserId}
                        onClick={() => void saveOrderSeller()}
                      >
                        {sellerUpdatingId === selectedOrder.id ? "Guardando..." : "Guardar vendedor"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                    <div>
                      <p className="text-sm font-semibold text-text">Destino del cobro</p>
                      <p className="mt-1 text-sm text-muted">Permite dejar claro donde entra el dinero antes o al momento de pagar.</p>
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
                        className="rounded-2xl"
                        disabled={readOnly || !backendReady || destinationUpdatingId === selectedOrder.id}
                        onClick={() => void saveOrderPaymentDestination()}
                      >
                        {destinationUpdatingId === selectedOrder.id ? "Guardando..." : "Guardar destino"}
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedOrder.transferPayment ? (
                  <div className="space-y-3 rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text">Validacion manual de transferencia</p>
                        <p className="mt-1 text-sm text-muted">Mantiene las acciones actuales de aprobacion y rechazo sin salir del detalle.</p>
                      </div>
                      <Badge variant={badgeForTransferValidation(selectedOrder.transferPayment.status)}>
                        {labelForTransferValidation(selectedOrder.transferPayment.status)}
                      </Badge>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailStat
                        label="Comprobante recibido"
                        value={selectedOrder.transferPayment.proofSubmittedAt ? formatDateCompact(selectedOrder.transferPayment.proofSubmittedAt) : "Sin fecha"}
                      />
                      <DetailStat label="Metodo" value={labelForTransferMethod(selectedOrder.transferPayment.paymentMethod)} />
                    </div>

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
                        className="rounded-2xl"
                        disabled={readOnly || paymentValidationBusy !== null}
                        onClick={() => void validateTransferPayment("approve")}
                      >
                        {paymentValidationBusy === "approve" ? "Aprobando..." : "Aprobar pago"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-2xl"
                        disabled={readOnly || paymentValidationBusy !== null}
                        onClick={() => void validateTransferPayment("reject")}
                      >
                        {paymentValidationBusy === "reject" ? "Rechazando..." : "Rechazar comprobante"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3 rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
                  <div>
                    <p className="text-sm font-semibold text-text">Cambiar estado</p>
                    <p className="mt-1 text-sm text-muted">Se mantienen las transiciones actuales disponibles dentro del modulo.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={selectedOrder.orderStatus === status ? "primary" : "secondary"}
                        size="sm"
                        className="rounded-2xl"
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
          </CardContent>
        </Card>

        <Card id="new-order" className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Alta desde catalogo</Badge>}>
            <div>
              <CardTitle className="text-xl">Nuevo pedido</CardTitle>
              <CardDescription>La alta sigue disponible, pero queda en segundo plano para priorizar dashboard y listado.</CardDescription>
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
                    <option value="">{metaLoading ? "Cargando vendedores..." : "Selecciona un vendedor"}</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name}
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
                      ? "El pedido tomara el nombre y telefono del contacto seleccionado."
                      : "El pedido quedara vinculado a un contacto real del workspace."}
                  </p>
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-[color:var(--border)] bg-surface/45 p-4 text-sm leading-7 text-muted">
                  El pedido se registrara como <span className="font-medium text-text">Consumidor final</span> sin exigir nombre ni telefono.
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
                <p className="text-sm font-semibold text-text">Producto del pedido</p>
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
                  <DetailStat
                    label="Precio unitario"
                    value={selectedProduct ? formatCurrency(resolveProductPrice(selectedProduct), selectedProduct.currency || "ARS") : "Pendiente"}
                  />
                  <DetailStat label="Stock catalogo" value={selectedProduct ? String(resolveProductStock(selectedProduct)) : "Pendiente"} />
                  <DetailStat label="Total estimado" value={selectedProduct ? formatCurrency(visibleTotal, selectedProduct.currency || "ARS") : "Pendiente"} />
                </div>

                {selectedProduct ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant={selectedStockState.variant}>{selectedStockState.label}</Badge>
                    {selectedStockState.isLowStock ? <span className="text-sm text-amber-300">Quedan pocas unidades disponibles.</span> : null}
                    {selectedStockState.isOutOfStock ? <span className="text-sm text-red-300">Este producto no tiene stock disponible.</span> : null}
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
                  Se mantiene la logica actual: stock real, responsable, cliente y cobro usando el flujo ya existente.
                </p>
                <Button
                  type="submit"
                  className="rounded-2xl"
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
  helper,
  accent
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  accent?: string;
}) {
  return (
    <Card className="overflow-hidden border-white/6 bg-card/90">
      <CardContent className="relative p-5">
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80", accent || "from-white/0 via-white/0 to-transparent")} />
        <div className="relative flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-surface/80">
            <Icon className="h-5 w-5 text-brandBright" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{helper}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SidebarCard({
  badge,
  title,
  description,
  children
}: {
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardContent className="p-5">
        <Badge variant="warning">{badge}</Badge>
        <h3 className="mt-4 text-xl font-semibold text-text">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-4">{children}</div>
      </CardContent>
    </Card>
  );
}

function OrdersTrendChart({
  series
}: {
  series: Array<{
    label: string;
    orders: number;
    revenue: number;
  }>;
}) {
  const orderPoints = buildLinePoints(series.map((item) => item.orders));
  const revenuePoints = buildLinePoints(series.map((item) => item.revenue));

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-surface/45 p-4">
        <svg viewBox="0 0 600 260" className="h-[260px] w-full" preserveAspectRatio="none" aria-hidden="true">
          {[0, 1, 2, 3].map((line) => (
            <line key={line} x1="0" x2="600" y1={30 + line * 55} y2={30 + line * 55} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          ))}
          <polyline fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={orderPoints} />
          <polyline fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" strokeLinejoin="round" points={revenuePoints} />
        </svg>
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-between text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>{series[0]?.label || "-"}</span>
          <span>{series[Math.max(series.length - 1, 0)]?.label || "-"}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Pedidos
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Facturacion
        </span>
      </div>
    </div>
  );
}

function OrderStatusRing({
  total,
  items
}: {
  total: number;
  items: Array<{ label: string; value: number; share: number; color: string }>;
}) {
  const gradient = buildConicGradient(items);

  return (
    <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
      <div className="mx-auto flex h-[180px] w-[180px] items-center justify-center rounded-full border border-white/10 bg-card/60">
        <div
          className="flex h-[148px] w-[148px] items-center justify-center rounded-full"
          style={{ backgroundImage: gradient }}
        >
          <div className="flex h-[102px] w-[102px] flex-col items-center justify-center rounded-full border border-white/10 bg-bg/95 text-center">
            <span className="text-3xl font-semibold text-text">{total}</span>
            <span className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">Total pedidos</span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-surface/45 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-text">{item.label}</span>
            </div>
            <span className="text-sm text-muted">
              {item.value} ({Math.round(item.share * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressList({
  items,
  emptyLabel,
  valueFormatter
}: {
  items: Array<{ label: string; value: number; share: number; color: string }>;
  emptyLabel: string;
  valueFormatter: (value: number) => string;
}) {
  if (items.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-surface/45 p-4 text-sm text-muted">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-text">{item.label}</span>
            <span className="text-muted">{valueFormatter(item.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/6">
            <div className="h-full rounded-full" style={{ width: `${Math.max(item.share * 100, 6)}%`, backgroundColor: item.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/55 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-text">{value}</p>
    </div>
  );
}

function buildLinePoints(values: number[]) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 560 + 20;
      const y = 220 - (value / max) * 170;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildConicGradient(items: Array<{ share: number; color: string }>) {
  let offset = 0;
  const stops = items.map((item) => {
    const start = Math.round(offset * 360);
    offset += item.share;
    const end = Math.round(offset * 360);
    return `${item.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function buildDistribution<T>(entries: T[], getLabel: (entry: T) => string, getValue: (entry: T) => number) {
  const palette = ["#22c55e", "#f59e0b", "#a855f7", "#3b82f6", "#14b8a6", "#ef4444"];
  const map = new Map<string, number>();

  entries.forEach((entry) => {
    const label = getLabel(entry);
    const value = Number(getValue(entry) || 0);
    if (!label || value <= 0) return;
    map.set(label, (map.get(label) || 0) + value);
  });

  const total = Array.from(map.values()).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  return Array.from(map.entries())
    .map(([label, value], index) => ({
      label,
      value,
      share: value / total,
      color: palette[index % palette.length]
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);
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
      return "Pendiente";
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

function labelForOrderCustomer(order: PortalOrder) {
  return order.customerType === "final_consumer" ? "Consumidor final" : order.customerName || order.contact?.name || "Cliente sin nombre";
}

function labelForOrderPhone(order: PortalOrder) {
  return order.customerPhone || order.contact?.phone || (order.customerType === "final_consumer" ? "No informado" : "Sin telefono");
}

function labelForOrderSeller(order: PortalOrder, sellers: AssignableSeller[] = []) {
  const fallbackSeller = order.sellerUserId ? sellers.find((seller) => seller.id === order.sellerUserId) : null;
  if (order.source === "bot" && !order.seller?.name && !order.sellerNameSnapshot) {
    return "Bot";
  }
  return order.seller?.name || order.sellerNameSnapshot || fallbackSeller?.name || "Sin asignar";
}

function labelForOrderSource(source: string | null | undefined) {
  switch (source) {
    case "whatsapp":
      return "WhatsApp";
    case "store":
    case "online_store":
      return "Tienda online";
    case "bot":
      return "Bot";
    case "import":
      return "Importacion";
    case "manual":
      return "Local";
    default:
      return source || "Manual";
  }
}

function labelForOrderPaymentMethod(order: PortalOrder) {
  const transferMethod = order.transferPayment?.paymentMethod;
  if (transferMethod === "bank_transfer") return "Transferencia bancaria";
  if (transferMethod === "cash") return "Efectivo";

  const destinationType = order.paymentDestination?.type || order.paymentDestinationTypeSnapshot;
  switch (destinationType) {
    case "wallet":
      return "Billetera";
    case "cash_box":
      return "Caja";
    case "bank":
      return "Transferencia bancaria";
    case "other":
      return "Otro";
    default:
      return order.paymentStatus === "paid" ? "Pago registrado" : "Pago pendiente";
  }
}

function labelForDeliveryState(order: PortalOrder) {
  if (order.orderStatus === "delivered") return "Entregado";
  if (order.orderStatus === "ready") return "Listo";
  if (order.orderStatus === "preparing" || order.orderStatus === "paid") return "En preparacion";
  if (order.orderStatus === "cancelled") return "Cancelado";
  return "Pendiente";
}

function isOperationalOrder(order: PortalOrder) {
  if (isPendingTransferValidation(order)) return true;
  return ["new", "pending_payment", "preparing", "ready"].includes(order.orderStatus);
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

function formatCurrency(value: number, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDateCompact(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function shortOrderId(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

function summarizeOrderItems(order: PortalOrder) {
  const units = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const names = order.items.slice(0, 2).map((item) => item.nameSnapshot);
  return `${units} unidad(es) · ${names.join(", ")}${order.items.length > 2 ? "..." : ""}`;
}

function needsAttention(order: PortalOrder) {
  if (isPendingTransferValidation(order)) return true;
  if (order.orderStatus === "new" || order.orderStatus === "pending_payment") return true;
  if (isOperationalOrder(order) && !order.sellerUserId) return true;
  if ((order.orderStatus === "paid" || order.orderStatus === "ready") && order.paymentStatus !== "paid") return true;
  return false;
}

function orderUrgencyScore(order: PortalOrder) {
  if (isPendingTransferValidation(order)) return 0;
  if (order.orderStatus === "pending_payment") return 1;
  if (order.orderStatus === "new") return 2;
  if (order.orderStatus === "ready") return 3;
  if (order.orderStatus === "preparing") return 4;
  if (order.orderStatus === "paid") return 5;
  if (order.orderStatus === "delivered") return 6;
  return 7;
}

function compareOrdersForDisplay(left: PortalOrder, right: PortalOrder) {
  const urgencyDelta = orderUrgencyScore(left) - orderUrgencyScore(right);
  if (urgencyDelta !== 0) return urgencyDelta;
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function labelForOrderAction(order: PortalOrder) {
  if (isPendingTransferValidation(order)) return "Validar comprobante";
  if (order.orderStatus === "new" || order.orderStatus === "pending_payment") return "Seguir cobro";
  if (order.orderStatus === "paid" || order.orderStatus === "preparing") return "Preparar entrega";
  if (order.orderStatus === "ready") return "Coordinar entrega";
  if (order.orderStatus === "delivered") return "Cerrar seguimiento";
  if (order.orderStatus === "cancelled") return "Revisar incidencia";
  return "Ver detalle";
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
