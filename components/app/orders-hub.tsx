"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, CreditCard, Package, Receipt } from "lucide-react";
import type { PortalOrder, PortalOrderPaymentMetrics, PortalOrderPaymentMetricsRange } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type OrdersHubProps = {
  initialOrders: PortalOrder[];
  initialOrderId?: string;
  readOnly?: boolean;
  backendReady: boolean;
};

type AssignableSeller = {
  id: string;
  name: string;
  role: string | null;
};

type OrdersViewMode = "all" | "pending_validation";

const ORDERS_PER_PAGE = 5;

const defaultPaymentMetrics: PortalOrderPaymentMetrics = {
  range: "last_7_days",
  pending: 0,
  approved: 0,
  rejected: 0
};

export function OrdersHub({ initialOrders, initialOrderId, readOnly = false, backendReady }: OrdersHubProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrders.find((order) => order.id === initialOrderId)?.id || null);
  const [viewMode, setViewMode] = useState<OrdersViewMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [listTab, setListTab] = useState<"all" | "pending" | "delivered" | "cancelled">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [metricsRange, setMetricsRange] = useState<PortalOrderPaymentMetricsRange>("last_7_days");
  const [paymentMetrics, setPaymentMetrics] = useState<PortalOrderPaymentMetrics>(defaultPaymentMetrics);
  const [sellers, setSellers] = useState<AssignableSeller[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);

  const monthSummary = useMemo(() => {
    const now = new Date();
    const monthlyOrders = initialOrders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    });

    return {
      count: monthlyOrders.length,
      revenue: monthlyOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    };
  }, [initialOrders]);

  const pendingOrdersCount = useMemo(
    () => initialOrders.filter((order) => !["delivered", "cancelled"].includes(order.orderStatus)).length,
    [initialOrders]
  );
  const cancelledOrdersCount = useMemo(() => initialOrders.filter((order) => order.orderStatus === "cancelled").length, [initialOrders]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredOrders = useMemo(() => {
    const candidateOrders = initialOrders.filter((order) => {
      if (viewMode === "pending_validation" && !isPendingTransferValidation(order)) return false;
      if (listTab === "pending" && ["delivered", "cancelled"].includes(order.orderStatus)) return false;
      if (listTab === "delivered" && !["ready", "delivered"].includes(order.orderStatus)) return false;
      if (listTab === "cancelled" && order.orderStatus !== "cancelled") return false;
      if (statusFilter !== "all" && order.orderStatus !== statusFilter) return false;
      if (sourceFilter !== "all" && (order.source || "manual") !== sourceFilter) return false;
      if (sellerFilter !== "all" && (order.sellerUserId || "unassigned") !== sellerFilter) return false;

      const createdAt = new Date(order.createdAt);
      if (dateFrom && createdAt < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && createdAt > new Date(`${dateTo}T23:59:59`)) return false;
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
        labelForOrderSeller(order, sellers),
        order.items.map((item) => item.nameSnapshot).join(" ")
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    return candidateOrders.slice().sort((left, right) => compareOrdersForDisplay(left, right));
  }, [dateFrom, dateTo, initialOrders, listTab, normalizedSearch, sellerFilter, sellers, sourceFilter, statusFilter, viewMode]);

  const sourceOptions = useMemo(
    () => Array.from(new Set(initialOrders.map((order) => order.source || "manual"))).sort((left, right) => left.localeCompare(right)),
    [initialOrders]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(initialOrders.map((order) => order.orderStatus))).sort((left, right) => left.localeCompare(right)),
    [initialOrders]
  );
  const tabCounts = useMemo(
    () => ({
      all: initialOrders.length,
      pending: initialOrders.filter((order) => !["delivered", "cancelled"].includes(order.orderStatus)).length,
      delivered: initialOrders.filter((order) => ["ready", "delivered"].includes(order.orderStatus)).length,
      cancelled: initialOrders.filter((order) => order.orderStatus === "cancelled").length
    }),
    [initialOrders]
  );
  const trendSeries = useMemo(() => {
    const buckets = new Map<string, { label: string; orders: number; revenue: number }>();

    for (let index = 29; index >= 0; index -= 1) {
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

    initialOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.orders += 1;
      bucket.revenue += Number(order.total || 0);
    });

    return Array.from(buckets.values());
  }, [initialOrders]);
  const statusBreakdown = useMemo(() => {
    const delivered = initialOrders.filter((order) => order.orderStatus === "delivered").length;
    const total = Math.max(delivered + pendingOrdersCount + cancelledOrdersCount, 1);

    return {
      total: initialOrders.length,
      items: [
        { label: "Entregados", value: delivered, color: "#22c55e", share: delivered / total },
        { label: "Pendientes", value: pendingOrdersCount, color: "#f59e0b", share: pendingOrdersCount / total },
        { label: "Cancelados", value: cancelledOrdersCount, color: "#ef4444", share: cancelledOrdersCount / total }
      ]
    };
  }, [cancelledOrdersCount, initialOrders.length, pendingOrdersCount]);
  const sourceBreakdown = useMemo(() => buildDistribution(initialOrders, (order) => labelForOrderSource(order.source), () => 1), [initialOrders]);
  const paymentBreakdown = useMemo(
    () => buildDistribution(initialOrders, (order) => labelForOrderPaymentMethod(order), (order) => Number(order.total || 0)),
    [initialOrders]
  );
  const topProducts = useMemo(
    () =>
      buildDistribution(
        initialOrders.flatMap((order) => order.items.map((item) => ({ item }))),
        (entry) => entry.item.nameSnapshot || "Producto sin nombre",
        (entry) => Number(entry.item.quantity || 0)
      ),
    [initialOrders]
  );
  const attentionOrders = useMemo(
    () =>
      initialOrders
        .filter((order) => needsAttention(order))
        .slice()
        .sort((left, right) => compareOrdersForDisplay(left, right))
        .slice(0, 4),
    [initialOrders]
  );
  const selectedOrder = useMemo(
    () => initialOrders.find((order) => order.id === selectedOrderId) || null,
    [initialOrders, selectedOrderId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOrderMeta() {
      try {
        const response = await fetch("/api/app/orders/meta", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.details || json?.error || "No se pudo cargar el equipo de ventas.");
        if (!cancelled) {
          setSellers(Array.isArray(json?.sellers) ? (json.sellers as AssignableSeller[]) : []);
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback({
            tone: "danger",
            text: error instanceof Error ? error.message : "No se pudo cargar el equipo comercial para Pedidos."
          });
        }
      }
    }

    void loadOrderMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      setMetricsLoading(true);
      try {
        const response = await fetch(`/api/app/orders/payment-metrics?range=${encodeURIComponent(metricsRange)}`, { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.details || json?.error || "No se pudieron cargar las metricas de pagos.");
        if (!cancelled) {
          setPaymentMetrics({
            range: metricsRange,
            pending: Number(json?.pending || 0),
            approved: Number(json?.approved || 0),
            rejected: Number(json?.rejected || 0)
          });
        }
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    }

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [metricsRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, listTab, statusFilter, sourceFilter, sellerFilter, dateFrom, dateTo, viewMode]);

  useEffect(() => {
    if (!initialOrderId) return;
    if (initialOrders.some((order) => order.id === initialOrderId)) {
      setSelectedOrderId(initialOrderId);
    }
  }, [initialOrderId, initialOrders]);

  const totalPages = Math.max(Math.ceil(filteredOrders.length / ORDERS_PER_PAGE), 1);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [currentPage, filteredOrders]);
  const paginationSummary = useMemo(() => {
    if (filteredOrders.length === 0) return "Mostrando 0-0 de 0";
    const from = (currentPage - 1) * ORDERS_PER_PAGE + 1;
    const to = Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length);
    return `Mostrando ${from}-${to} de ${filteredOrders.length}`;
  }, [currentPage, filteredOrders.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function applyQuickView(mode: "pending_validation" | "pending" | "delivered") {
    setCurrentPage(1);
    if (mode === "pending_validation") {
      setViewMode("pending_validation");
      setListTab("all");
      return;
    }

    setViewMode("all");
    setListTab(mode);
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
              <CardDescription>Este modulo necesita el backend del portal configurado para listar pedidos reales.</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={ClipboardList} label="Pedidos del mes" value={String(monthSummary.count)} helper="Pedidos creados en el mes actual con datos reales del tenant." accent="from-brand/30 via-brandBright/12 to-transparent" />
        <MetricCard icon={Receipt} label="Facturacion del mes" value={formatCurrency(monthSummary.revenue)} helper="Facturacion visible desde pedidos del mes en la moneda actual." accent="from-sky-500/28 via-sky-400/10 to-transparent" />
        <MetricCard icon={Package} label="Pedidos entregados" value={String(initialOrders.filter((order) => order.orderStatus === "delivered").length)} helper="Pedidos ya cerrados con entrega registrada." accent="from-emerald-500/28 via-emerald-400/10 to-transparent" />
        <MetricCard icon={AlertTriangle} label="Pendientes" value={String(pendingOrdersCount)} helper="Pedidos abiertos que aun requieren cobro, preparacion o entrega." accent="from-amber-500/28 via-amber-400/10 to-transparent" />
        <MetricCard icon={CreditCard} label="Cancelados" value={String(cancelledOrdersCount)} helper="Pedidos fuera del circuito activo." accent="from-rose-500/24 via-rose-400/10 to-transparent" />
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
                  {attentionOrders.length > 0 ? `${attentionOrders.length} pedidos requieren atencion inmediata.` : "La operacion no tiene alertas criticas en este momento."}
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
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar por numero, cliente, producto o referencia..." aria-label="Buscar pedidos" />
                <select className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">Todos los estados</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {labelForOrderStatus(status)}
                    </option>
                  ))}
                </select>
                <select className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  <option value="all">Todos los canales</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {labelForOrderSource(source)}
                    </option>
                  ))}
                </select>
                <select className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text" value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)}>
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
                  <Button type="button" size="sm" variant={viewMode === "pending_validation" ? "secondary" : "ghost"} onClick={() => setViewMode("pending_validation")}>
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
                <CardDescription>{paginationSummary}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {selectedOrder ? (
                <div className="mb-4 rounded-[22px] border border-brand/20 bg-[linear-gradient(180deg,rgba(255,128,0,0.08),rgba(10,17,30,0.35))] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-brandBright">Pedido seleccionado</p>
                      <p className="mt-2 text-base font-semibold text-text">{labelForOrderCustomer(selectedOrder)}</p>
                      <p className="mt-1 text-sm text-muted">
                        {shortOrderId(selectedOrder.id)} · {formatDateCompact(selectedOrder.createdAt)} · {labelForOrderSeller(selectedOrder, sellers)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={badgeForOrderStatus(selectedOrder.orderStatus)}>{labelForOrderStatus(selectedOrder.orderStatus)}</Badge>
                      <Badge variant={badgeForPaymentStatus(selectedOrder.paymentStatus)}>{labelForPaymentStatus(selectedOrder.paymentStatus)}</Badge>
                      <Badge variant="outline">{formatCurrency(selectedOrder.total, selectedOrder.currency)}</Badge>
                    </div>
                  </div>
                </div>
              ) : null}

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
                  <div className="hidden overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-surface/45 xl:block">
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
                        {paginatedOrders.map((order) => (
                          <tr key={order.id} className={cn("border-t border-[color:var(--border)]", selectedOrderId === order.id ? "bg-brand/6" : "bg-transparent")}>
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
                                <Button type="button" size="sm" className="rounded-2xl" variant={selectedOrderId === order.id ? "secondary" : "primary"} onClick={() => setSelectedOrderId(order.id)}>
                                  {selectedOrderId === order.id ? "Seleccionado" : "Seleccionar"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 xl:hidden">
                    {paginatedOrders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className={cn(
                          "w-full rounded-[24px] border p-4 text-left transition-colors",
                          selectedOrderId === order.id
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

              <div className="mt-4 flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-muted">{paginationSummary}</p>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="secondary" className="rounded-2xl" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => page - 1)}>
                    Anterior
                  </Button>
                  <Badge variant="muted">Pagina {currentPage} de {totalPages}</Badge>
                  <Button type="button" size="sm" variant="secondary" className="rounded-2xl" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <SidebarCard badge="Atajos rapidos" title="Acciones utiles" description="Accede rapido a lo que mas se usa en la operacion diaria.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {!readOnly ? (
                <Button asChild className="justify-start rounded-2xl">
                  <a href="/app/orders/new">Nuevo pedido</a>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="justify-start rounded-2xl"
                onClick={() => applyQuickView("pending_validation")}
              >
                Validar pagos
              </Button>
              <Button type="button" variant="secondary" className="justify-start rounded-2xl" onClick={() => applyQuickView("pending")}>
                Pedidos pendientes
              </Button>
              <Button type="button" variant="secondary" className="justify-start rounded-2xl" onClick={() => applyQuickView("delivered")}>
                Pedidos entregados
              </Button>
            </div>
          </SidebarCard>

          <SidebarCard badge="Resumen del dia" title="Canales de origen" description="De donde llegan los pedidos que hoy alimentan la operacion.">
            <ProgressList items={sourceBreakdown} emptyLabel="Todavia no hay canales suficientes para mostrar un ranking." valueFormatter={(value) => `${value} pedido(s)`} />
          </SidebarCard>

          <SidebarCard badge="Cobros" title="Metodos de pago" description="Distribucion real usando el metodo o destino de cobro disponible en cada pedido.">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={metricsRange === "today" ? "primary" : "secondary"} onClick={() => setMetricsRange("today")}>
                Dia
              </Button>
              <Button type="button" size="sm" variant={metricsRange === "last_7_days" ? "primary" : "secondary"} onClick={() => setMetricsRange("last_7_days")}>
                Semana
              </Button>
              <Button type="button" size="sm" variant={metricsRange === "last_30_days" ? "primary" : "secondary"} onClick={() => setMetricsRange("last_30_days")}>
                Mes
              </Button>
            </div>
            <ProgressList items={paymentBreakdown} emptyLabel="Aun no hay datos suficientes para desglosar los metodos de pago." valueFormatter={(value) => formatCurrency(value)} />
            <div className="mt-4 grid gap-3">
              <DetailStat label="Pendientes" value={metricsLoading ? "..." : String(paymentMetrics.pending)} />
              <DetailStat label="Aprobados" value={metricsLoading ? "..." : String(paymentMetrics.approved)} />
              <DetailStat label="Rechazados" value={metricsLoading ? "..." : String(paymentMetrics.rejected)} />
            </div>
          </SidebarCard>

          <SidebarCard badge="Catalogo" title="Top productos pedidos" description="Productos con mas salida por cantidad pedida en los pedidos reales cargados.">
            <ProgressList items={topProducts} emptyLabel="Aun no hay productos suficientes para construir el ranking." valueFormatter={(value) => `${value} unidad(es)`} />
          </SidebarCard>
        </div>
      </div>
    </div>
  );
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
        <div className="flex h-[148px] w-[148px] items-center justify-center rounded-full" style={{ backgroundImage: gradient }}>
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
  if (order.source === "bot" && !order.seller?.name && !order.sellerNameSnapshot) return "Bot";
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

function needsAttention(order: PortalOrder) {
  if (isPendingTransferValidation(order)) return true;
  if (order.orderStatus === "new" || order.orderStatus === "pending_payment") return true;
  if (["new", "pending_payment", "preparing", "ready"].includes(order.orderStatus) && !order.sellerUserId) return true;
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
