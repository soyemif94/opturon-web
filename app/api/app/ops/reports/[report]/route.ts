import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ConversationRowData } from "@/components/app/inbox/types";
import {
  getPortalConversations,
  getPortalInventoryLots,
  getPortalInventoryMovements,
  getPortalInventoryProducts,
  getPortalOrders,
  getPortalUsers,
  isBackendConfigured
} from "@/lib/api";
import { hasOpsAccessCookie } from "@/lib/ops-access";
import { buildCsv, filterBySeller, isWithinReportDateRange, summarizeSellerRows } from "@/lib/ops/reporting";
import { isColdLead, isInRecovery } from "@/lib/ops/commercial-state";
import { isOperationalPortalAssigneeUser } from "@/lib/portal-users";
import { getPortalInventoryReadActor, requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";
import { createOpsReportXlsx, type OpsXlsxColumn, type OpsXlsxReport } from "@/lib/ops/report-xlsx";

export const runtime = "nodejs";

const filterSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sellerId: z.string().max(100).optional(),
  stage: z.enum(["NEW", "IN_CONVERSATION", "FOLLOW_UP", "CLOSED", "open", "paid", "pending", "cancelled"]).optional(),
  channel: z.enum(["all", "whatsapp", "instagram"]).optional(),
  operationalState: z.enum(["all", "active", "cold", "recovery"]).optional(),
  customer: z.string().max(100).optional(),
  product: z.string().max(100).optional(),
  supplier: z.string().max(100).optional(),
  warehouse: z.string().max(100).optional(),
  locationId: z.string().max(100).optional(),
  movementType: z.enum(["initial_stock", "opening_balance", "purchase_receipt", "manual_increase", "manual_decrease", "correction", "return_in", "return_out", "manual_adjustment_in", "manual_adjustment_out", "expired_writeoff", "cancellation", "sale"]).optional(),
  expirationStatus: z.enum(["no_expiration", "expired", "today", "critical", "urgent", "warning", "upcoming", "normal"]).optional(),
  expiresAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiresBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.enum(["xlsx", "csv", "json"]).optional()
});

const reportPresentation: Record<string, { title: string; filename: string }> = {
  sales: { title: "Opturon — Informe de Ventas y Operaciones", filename: "ventas" },
  sellers: { title: "Opturon — Rendimiento por Vendedor", filename: "vendedores" },
  followups: { title: "Opturon — Actividad y Seguimientos", filename: "seguimientos" },
  inventory: { title: "Opturon — Inventario Actual", filename: "inventario" },
  movements: { title: "Opturon — Movimientos de Inventario", filename: "movimientos" },
  expirations: { title: "Opturon — Lotes y Vencimientos", filename: "vencimientos" }
};

const reportTypes = ["sales", "sellers", "followups", "inventory", "movements", "expirations"] as const;
type ReportPhase = "AUTH" | "VALIDATION" | "QUERY" | "TRANSFORM" | "XLSX_GENERATION" | "RESPONSE";

function getReportRequestId(request: NextRequest) {
  const supplied = request.headers.get("x-ops-report-request-id") || "";
  return /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(supplied)
    ? supplied
    : randomUUID();
}

const statusLabels: Record<string, string> = {
  paid: "Cobrado", unpaid: "Pendiente", pending: "Pendiente", open: "Abierta", new: "Nuevo", NEW: "Nuevo",
  IN_CONVERSATION: "En conversación", FOLLOW_UP: "Seguimiento", CLOSED: "Cerrado", cancelled: "Cancelada",
  whatsapp: "WhatsApp", instagram: "Instagram", manual: "Manual", bot: "Asistente",
  active: "Activa", cold: "Sin actividad", recovery: "En recuperación",
  with_stock: "Con stock", low_stock: "Stock bajo", without_stock: "Sin stock"
};

const movementLabels: Record<string, string> = {
  initial_stock: "Stock inicial", opening_balance: "Carga inicial", purchase_receipt: "Recepción",
  manual_increase: "Ingreso manual", manual_decrease: "Salida manual", correction: "Corrección",
  return_in: "Devolución recibida", return_out: "Devolución entregada", manual_adjustment_in: "Ajuste de lotes (ingreso)",
  manual_adjustment_out: "Ajuste de lotes (salida)", expired_writeoff: "Baja por vencimiento", cancellation: "Cancelación", sale: "Venta"
};

const expirationLabels: Record<string, string> = {
  expired: "Vencido", today: "Próximo a vencer", critical: "Próximo a vencer", urgent: "Próximo a vencer",
  warning: "Próximo a vencer", upcoming: "Próximo a vencer", normal: "Vigente", no_expiration: "Sin vencimiento"
};

function humanize(value: unknown, labels: Record<string, string> = statusLabels) {
  const text = String(value ?? "");
  return Object.hasOwn(labels, text) ? labels[text] : text;
}

function reportFilters(filters: z.infer<typeof filterSchema>, sellerName?: string): OpsXlsxReport["filters"] {
  return [
    { label: "Vendedor", value: filters.sellerId ? sellerName || "Vendedor seleccionado" : "" },
    { label: "Cliente", value: filters.customer || "" },
    { label: "Etapa", value: filters.stage ? humanize(filters.stage) : "" },
    { label: "Condición", value: filters.operationalState && filters.operationalState !== "all" ? humanize(filters.operationalState) : "" },
    { label: "Canal", value: filters.channel && filters.channel !== "all" ? humanize(filters.channel) : "" },
    { label: "Producto", value: filters.product || "" },
    { label: "Proveedor", value: filters.supplier || "" },
    { label: "Depósito", value: filters.warehouse || "" },
    { label: "Tipo de movimiento", value: filters.movementType ? humanize(filters.movementType, movementLabels) : "" },
    { label: "Estado de vencimiento", value: filters.expirationStatus ? humanize(filters.expirationStatus, expirationLabels) : "" }
  ].filter((filter) => Boolean(filter.value));
}

function csvCell(value: unknown, kind?: OpsXlsxColumn["kind"]) {
  const dateValue = value instanceof Date
    ? value
    : kind === "dateOnly" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00Z`)
      : (kind === "date" || kind === "dateOnly") && typeof value === "string" ? new Date(value) : null;
  if (dateValue && !Number.isNaN(dateValue.getTime())) {
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: kind === "dateOnly" ? "UTC" : "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric",
      ...(kind === "date" ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {})
    }).format(dateValue);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: kind === "currency" ? 2 : 0,
      maximumFractionDigits: kind === "currency" ? 2 : 6
    }).format(value);
  }
  return value;
}

async function reportDownloadResponse(report: string, dateTag: string, filters: z.infer<typeof filterSchema>, columns: OpsXlsxColumn[], rows: Array<Record<string, unknown>>, generatedAt: Date, sellerName: string | undefined, onPhase: (phase: ReportPhase) => void, additionalSheets?: OpsXlsxReport["additionalSheets"]) {
  const presentation = reportPresentation[report];
  const outputFormat = filters.format === "csv" ? "csv" : "xlsx";
  const filename = `opturon-${presentation.filename}-${dateTag}.${outputFormat}`;
  const headers = columns.map((column) => column.header);
  const responseHeaders = {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "Pragma": "no-cache"
  };
  if (outputFormat === "csv") {
    onPhase("RESPONSE");
    const csvRows = rows.map((row) => columns.map((column) => csvCell(row[column.key], column.kind)));
    return new NextResponse(`\uFEFF${buildCsv(headers, csvRows, ";")}`, {
      status: 200,
      headers: { ...responseHeaders, "Content-Type": "text/csv; charset=utf-8" }
    });
  }
  onPhase("XLSX_GENERATION");
  const workbook = await createOpsReportXlsx({
    title: presentation.title,
    generatedAt,
    period: filters.dateFrom || filters.dateTo
      ? `${filters.dateFrom || "Inicio"}${filters.dateTo ? ` al ${filters.dateTo}` : " en adelante"}`
      : "Todos los períodos",
    filters: reportFilters(filters, sellerName),
    columns,
    rows,
    additionalSheets
  });
  onPhase("RESPONSE");
  return new NextResponse(new Uint8Array(workbook), {
    status: 200,
    headers: { ...responseHeaders, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  });
}

function filteredConversations(conversations: Array<Record<string, any>>, filters: z.infer<typeof filterSchema>, useFollowUpDate = false) {
  const customer = filters.customer?.trim().toLocaleLowerCase();
  return conversations.filter((row) => {
    if (filters.sellerId && row.assignedSellerUserId !== filters.sellerId) return false;
    if (filters.stage && row.leadStatus !== filters.stage) return false;
    if (filters.channel && filters.channel !== "all" && String(row.channelType || "whatsapp").toLowerCase() !== filters.channel) return false;
    if (!isWithinReportDateRange(useFollowUpDate ? row.nextActionAt || row.lastCommercialActivityAt || row.lastMessageAt : row.lastCommercialActivityAt || row.lastMessageAt, filters)) return false;
    if (filters.operationalState && filters.operationalState !== "all") {
      const cold = isColdLead(row as unknown as ConversationRowData, new Date());
      const recovery = isInRecovery(row as unknown as ConversationRowData, new Date());
      if (filters.operationalState === "cold" && !cold) return false;
      if (filters.operationalState === "recovery" && !recovery) return false;
      if (filters.operationalState === "active" && (cold || recovery)) return false;
    }
    if (customer && !String(row.contact?.name || "").toLocaleLowerCase().includes(customer)) return false;
    return true;
  });
}

function filteredOrders(orders: Array<Record<string, any>>, filters: z.infer<typeof filterSchema>) {
  const customer = filters.customer?.trim().toLocaleLowerCase();
  const product = filters.product?.trim().toLocaleLowerCase();
  return filterBySeller(orders, filters.sellerId).filter((order) => {
    if (!isWithinReportDateRange(order.createdAt, filters)) return false;
    if (filters.stage && order.orderStatus !== filters.stage && order.paymentStatus !== filters.stage) return false;
    if (filters.channel && filters.channel !== "all" && !String(order.source || "").toLowerCase().includes(filters.channel)) return false;
    if (customer && !String(order.customerName || order.contact?.name || "").toLocaleLowerCase().includes(customer)) return false;
    if (product && !(order.items || []).some((item: Record<string, unknown>) => `${item.nameSnapshot || ""} ${item.productId || ""}`.toLocaleLowerCase().includes(product))) return false;
    return true;
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ report: string }> }) {
  const requestId = getReportRequestId(request);
  const startedAt = performance.now();
  let reportType = "unknown";
  let phase: ReportPhase = "AUTH";
  let resolvedTenantId: string | null = null;
  let failedTeamDataSource: "conversations" | "orders" | "users" | null = null;
  let failedTeamUpstreamStatus: number | null = null;
  const finish = (response: NextResponse, safeErrorCode: string | null = null) => {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("X-Ops-Report-Phase", phase);
    const diagnostic = {
      requestId,
      reportType,
      status: response.status,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      contentType: response.headers.get("Content-Type") || null,
      safeErrorCode: response.status >= 400 ? safeErrorCode || "http_error" : null,
      route: "/api/app/ops/reports/[report]",
      phase,
      ...(reportType === "sellers" && new URL(request.url).searchParams.get("format") === "json" ? {
        tenantId: resolvedTenantId,
        failedDataSource: failedTeamDataSource,
        upstreamStatus: failedTeamUpstreamStatus
      } : {})
    };
    if (response.status >= 400) console.warn("ops_report_request", diagnostic);
    else console.info("ops_report_request", diagnostic);
    return response;
  };
  const setPhase = (nextPhase: ReportPhase) => { phase = nextPhase; };
  const { report } = await params;
  reportType = reportTypes.includes(report as typeof reportTypes[number]) ? report : "unknown";

  const cookieStore = await cookies();
  if (!hasOpsAccessCookie(cookieStore)) return finish(NextResponse.json({ error: "ops_access_required" }, { status: 403 }), "ops_access_required");

  if (!reportTypes.includes(report as typeof reportTypes[number])) {
    setPhase("VALIDATION");
    return finish(NextResponse.json({ error: "ops_report_not_found" }, { status: 404 }), "ops_report_not_found");
  }
  const requiredModule: "sales" | "orders" | "ops" | "inventory" =
    report === "sales" ? "sales" : report === "sellers" ? "orders" : ["inventory", "movements", "expirations"].includes(report) ? "inventory" : "ops";
  const guard = await requireAppModuleApi(requiredModule, { permission: "manage_workspace" });
  if (guard.error) return finish(guard.error, "app_module_access_denied");
  if (report === "sales") {
    const ordersGuard = await requireAppModuleApi("orders", { permission: "manage_workspace" });
    if (ordersGuard.error) return finish(ordersGuard.error, "app_module_access_denied");
  }
  const tenantContext = await resolveAppTenant({ permission: "manage_workspace" });
  if (tenantContext.error) return finish(tenantContext.error, "tenant_access_denied");
  resolvedTenantId = tenantContext.tenantId;
  if (!isBackendConfigured()) {
    setPhase("QUERY");
    return finish(NextResponse.json({ error: "ops_report_backend_unavailable" }, { status: 503 }), "ops_report_backend_unavailable");
  }

  setPhase("VALIDATION");
  const parsed = filterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return finish(NextResponse.json({ error: "invalid_report_filters" }, { status: 400 }), "invalid_report_filters");
  const filters = parsed.data;
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    return finish(NextResponse.json({ error: "invalid_report_date_range" }, { status: 400 }), "invalid_report_date_range");
  }

  try {
    const generatedAt = new Date();
    const dateTag = filters.dateFrom || generatedAt.toISOString().slice(0, 10);
    const inventoryActor = ["inventory", "movements", "expirations"].includes(report)
      ? getPortalInventoryReadActor(guard.ctx || {})
      : null;
    if (report === "inventory") {
      setPhase("QUERY");
      const pageSize = 100;
      const first = await getPortalInventoryProducts(tenantContext.tenantId, { search: filters.product, page: 1, pageSize }, inventoryActor!);
      const products = [...(first.data?.products || [])];
      const total = Number(first.data?.total || products.length);
      const pages = Math.min(Math.ceil(total / pageSize), 100);
      for (let page = 2; page <= pages; page += 1) {
        const result = await getPortalInventoryProducts(tenantContext.tenantId, { search: filters.product, page, pageSize }, inventoryActor!);
        products.push(...(result.data?.products || []));
      }
      if (total > pageSize * 100) {
        setPhase("VALIDATION");
        return finish(NextResponse.json({ error: "report_too_large_apply_product_filter" }, { status: 413 }), "report_too_large_apply_product_filter");
      }
      setPhase("TRANSFORM");
      const columns: OpsXlsxColumn[] = [
        { header: "SKU", key: "sku", width: 18 }, { header: "Producto", key: "product", width: 32, wrapText: true },
        { header: "Categoría", key: "category", width: 24, wrapText: true }, { header: "Stock", key: "stock", kind: "number", width: 14 },
        { header: "Estado", key: "state", width: 18 }, { header: "Ubicación", key: "location", width: 24, wrapText: true },
        { header: "Último movimiento", key: "lastMovementAt", kind: "date", width: 22 }
      ];
      const rows = products.map((product) => ({
        sku: product.sku || "", product: product.name, category: product.categoryName || "", stock: product.stock,
        state: humanize(product.stockState), location: product.locationName || "", lastMovementAt: product.lastMovementAt || ""
      }));
      return finish(await reportDownloadResponse("inventory", dateTag, filters, columns, rows, generatedAt, undefined, setPhase));
    }
    if (report === "movements") {
      setPhase("QUERY");
      const pageSize = 100;
      const options = {
        search: filters.product,
        productId: filters.product && /^[0-9a-f-]{36}$/i.test(filters.product) ? filters.product : undefined,
        locationId: filters.locationId,
        movementType: filters.movementType,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        pageSize
      } as const;
      const first = await getPortalInventoryMovements(tenantContext.tenantId, { ...options, page: 1 }, inventoryActor!);
      const items = [...(first.data?.items || [])];
      const total = Number(first.data?.total || items.length);
      const pages = Math.min(Math.ceil(total / pageSize), 100);
      for (let page = 2; page <= pages; page += 1) {
        const result = await getPortalInventoryMovements(tenantContext.tenantId, { ...options, page }, inventoryActor!);
        items.push(...(result.data?.items || []));
      }
      if (total > pageSize * 100) {
        setPhase("VALIDATION");
        return finish(NextResponse.json({ error: "report_too_large_apply_date_or_product_filter" }, { status: 413 }), "report_too_large_apply_date_or_product_filter");
      }
      setPhase("TRANSFORM");
      const columns: OpsXlsxColumn[] = [
        { header: "Fecha", key: "createdAt", kind: "date", width: 22 }, { header: "Tipo", key: "type", width: 28 },
        { header: "SKU", key: "sku", width: 18 }, { header: "Producto", key: "product", width: 30, wrapText: true },
        { header: "Cantidad", key: "quantity", kind: "number", width: 15 }, { header: "Stock anterior", key: "quantityBefore", kind: "number", width: 17 },
        { header: "Stock posterior", key: "quantityAfter", kind: "number", width: 17 }, { header: "Motivo", key: "reason", width: 34, wrapText: true },
        { header: "Usuario", key: "actor", width: 24, wrapText: true }, { header: "Depósito", key: "location", width: 24 },
        { header: "Lote", key: "lot", width: 18 }
      ];
      const rows = items.map((item) => ({
        createdAt: item.createdAt, type: humanize(item.movementType, movementLabels), sku: item.productSku || "",
        product: item.productName || "", quantity: Number(item.quantity), quantityBefore: item.quantityBefore == null ? null : Number(item.quantityBefore),
        quantityAfter: item.quantityAfter == null ? null : Number(item.quantityAfter), reason: item.reason || "",
        actor: item.actorName || "Usuario no identificado", location: item.locationName || "", lot: item.lotNumber || ""
      }));
      return finish(await reportDownloadResponse("movements", dateTag, filters, columns, rows, generatedAt, undefined, setPhase));
    }
    if (report === "expirations") {
      setPhase("QUERY");
      const result = await getPortalInventoryLots(tenantContext.tenantId, {
        search: filters.product,
        supplier: filters.supplier,
        warehouse: filters.warehouse,
        location: filters.locationId,
        expirationStatus: filters.expirationStatus,
        expiresAfter: filters.expiresAfter || filters.dateFrom,
        expiresBefore: filters.expiresBefore || filters.dateTo,
        pageSize: 250
      }, inventoryActor!);
      const lots = result.data?.lots || [];
      if (lots.length >= 250) {
        setPhase("VALIDATION");
        return finish(NextResponse.json({ error: "report_too_large_apply_expiration_product_or_supplier_filter" }, { status: 413 }), "report_too_large_apply_expiration_product_or_supplier_filter");
      }
      setPhase("TRANSFORM");
      const columns: OpsXlsxColumn[] = [
        { header: "Producto", key: "product", width: 30, wrapText: true }, { header: "SKU", key: "sku", width: 18 },
        { header: "Lote", key: "lot", width: 20 }, { header: "Fecha de vencimiento", key: "expiresAt", kind: "dateOnly", width: 24 },
        { header: "Días restantes", key: "daysRemaining", kind: "number", width: 16 },
        { header: "Cantidad disponible", key: "quantity", kind: "number", width: 21 },
        { header: "Estado", key: "state", width: 22 }, { header: "Proveedor", key: "supplier", width: 28 },
        { header: "Depósito", key: "warehouse", width: 24 }, { header: "Ubicación", key: "location", width: 24 }
      ];
      const rows = lots.map((lot) => ({
        product: lot.productName || "", sku: lot.productSku || "", lot: lot.lotNumber || "", expiresAt: lot.expiresAt || "",
        daysRemaining: lot.daysUntilExpiration ?? null, quantity: lot.availableQuantity, state: humanize(lot.expirationStatus, expirationLabels),
        supplier: lot.supplierName || "", warehouse: lot.warehouseName || "", location: lot.locationName || ""
      }));
      return finish(await reportDownloadResponse("expirations", dateTag, filters, columns, rows, generatedAt, undefined, setPhase));
    }
    setPhase("QUERY");
    const isTeamJsonRequest = report === "sellers" && filters.format === "json";
    const traceTeamQuery = <T,>(source: "conversations" | "orders" | "users", query: Promise<T>) => {
      if (!isTeamJsonRequest) return query;
      return query.catch((error: unknown) => {
        failedTeamDataSource = source;
        const status = error && typeof error === "object" && "status" in error ? Number(error.status) : Number.NaN;
        failedTeamUpstreamStatus = Number.isInteger(status) && status >= 400 ? status : null;
        throw error;
      });
    };
    const [conversationsResult, ordersResult, usersResult] = await Promise.all([
      traceTeamQuery("conversations", report === "sales" && filters.format !== "json" ? Promise.resolve(null) : getPortalConversations(tenantContext.tenantId, { visibility: "active", channel: "all" })),
      traceTeamQuery("orders", report === "followups" ? Promise.resolve(null) : getPortalOrders(tenantContext.tenantId)),
      traceTeamQuery("users", report === "sellers" ? getPortalUsers(tenantContext.tenantId) : Promise.resolve(null))
    ]);
    const conversations = conversationsResult?.data?.conversations || [];
    const orders = ordersResult?.data?.orders || [];
    setPhase("TRANSFORM");
    const sellerDirectory = (usersResult?.data?.users || [])
      .filter((user) => isOperationalPortalAssigneeUser(user))
      .map((user) => ({ id: String(user.id), name: String(user.name || "Vendedor") }));
    const sellerName = filters.sellerId
      ? sellerDirectory.find((seller) => seller.id === filters.sellerId)?.name
        || orders.find((order) => order.sellerUserId === filters.sellerId)?.sellerNameSnapshot
        || orders.find((order) => order.sellerUserId === filters.sellerId)?.seller?.name
        || conversations.find((row: Record<string, any>) => row.assignedSellerUserId === filters.sellerId)?.assignedSellerName
      : undefined;

    if (report === "sales") {
      const selectedOrders = filteredOrders(orders, filters);
      const selectedConversations = filteredConversations(conversations, filters);
      if (filters.format === "json") {
        const paidOrders = selectedOrders.filter((order) => String(order.paymentStatus || "").toLowerCase() === "paid" && String(order.orderStatus || "").toLowerCase() !== "cancelled");
        const paidRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const bySeller = new Map<string, { sellerId: string; sellerName: string; paidOperations: number; revenue: number; currency: string }>();
        for (const order of paidOrders) {
          const sellerId = String(order.sellerUserId || "unassigned");
          const entry = bySeller.get(sellerId) || { sellerId, sellerName: order.sellerNameSnapshot || order.seller?.name || "Sin vendedor", paidOperations: 0, revenue: 0, currency: order.currency || "ARS" };
          entry.paidOperations += 1;
          entry.revenue += Number(order.total || 0);
          bySeller.set(sellerId, entry);
        }
        setPhase("RESPONSE");
        return finish(NextResponse.json({
          summary: {
            operationCount: paidOrders.length,
            revenue: paidRevenue,
            averageTicket: paidOrders.length ? paidRevenue / paidOrders.length : 0,
            openPipelineCount: selectedConversations.filter((row: Record<string, any>) => row.leadStatus !== "CLOSED").length,
            currency: paidOrders[0]?.currency || "ARS"
          },
          bySeller: [...bySeller.values()].sort((a, b) => b.revenue - a.revenue)
        }));
      }
      const columns: OpsXlsxColumn[] = [
        { header: "Fecha", key: "createdAt", kind: "date", width: 22 }, { header: "Operación", key: "operation", width: 24 },
        { header: "Vendedor", key: "seller", width: 24, wrapText: true }, { header: "Cliente", key: "customer", width: 26, wrapText: true },
        { header: "Estado", key: "orderStatus", width: 18 }, { header: "Estado de cobro", key: "paymentStatus", width: 20 },
        { header: "Canal", key: "channel", width: 18 }, { header: "Importe", key: "total", kind: "currency", width: 18 },
        { header: "Moneda", key: "currency", width: 12 }, { header: "Productos", key: "products", width: 48, wrapText: true }
      ];
      const rows = selectedOrders.map((order) => ({
        createdAt: order.createdAt, operation: order.id, seller: order.sellerNameSnapshot || order.seller?.name || "",
        customer: order.customerName || order.contact?.name || "", orderStatus: humanize(order.orderStatus),
        paymentStatus: humanize(order.paymentStatus), channel: humanize(order.source || ""), total: Number(order.total), currency: order.currency || "",
        products: (order.items || []).map((item: Record<string, any>) => `${item.nameSnapshot || "Producto"} × ${item.quantity || 0}`).join(" | ")
      }));
      const detailColumns: OpsXlsxColumn[] = [
        { header: "Operación", key: "operation", width: 24 }, { header: "Producto", key: "product", width: 40, wrapText: true },
        { header: "SKU", key: "sku", width: 18 }, { header: "Cantidad", key: "quantity", kind: "number", width: 14 },
        { header: "Precio unitario", key: "price", kind: "currency", width: 20 }, { header: "Subtotal", key: "subtotal", kind: "currency", width: 20 },
        { header: "Moneda", key: "currency", width: 12 }
      ];
      const productRows = selectedOrders.flatMap((order) => (order.items || []).map((item: Record<string, any>) => ({
        operation: order.id, product: item.nameSnapshot || "Producto", sku: item.skuSnapshot || "", quantity: Number(item.quantity || 0),
        price: Number(item.priceSnapshot || 0), subtotal: Number(item.priceSnapshot || 0) * Number(item.quantity || 0),
        currency: item.currencySnapshot || order.currency || ""
      })));
      return finish(await reportDownloadResponse("sales", dateTag, filters, columns, rows, generatedAt, sellerName, setPhase, [
        { name: "Detalle de productos", columns: detailColumns, rows: productRows }
      ]));
    } else if (report === "sellers") {
      const filteredLeads = filteredConversations(conversations, filters);
      const filteredSales = filteredOrders(orders, filters);
      const sellerSummary = summarizeSellerRows(filteredLeads, filteredSales, generatedAt, sellerDirectory).map((seller) => ({
        ...seller,
        averageTicket: seller.paidSalesCount ? seller.revenue / seller.paidSalesCount : 0
      }));
      if (filters.format === "json") {
        setPhase("RESPONSE");
        return finish(NextResponse.json({ sellers: sellerSummary }));
      }
      const columns: OpsXlsxColumn[] = [
        { header: "Vendedor", key: "seller", width: 28 }, { header: "Leads activos", key: "activeLeads", kind: "number", width: 16 },
        { header: "Nuevos", key: "newLeads", kind: "number", width: 14 }, { header: "Seguimientos activos", key: "followUps", kind: "number", width: 22 },
        { header: "Vencidos", key: "overdueFollowUps", kind: "number", width: 14 }, { header: "Recuperaciones 72 h", key: "recoveryStarted72h", kind: "number", width: 22 },
        { header: "Operaciones", key: "salesCount", kind: "number", width: 16 }, { header: "Operaciones cobradas", key: "paidSalesCount", kind: "number", width: 23 },
        { header: "Importe cobrado", key: "revenue", kind: "currency", width: 20 }, { header: "Moneda", key: "currency", width: 12 }
      ];
      const rows = sellerSummary.map((seller) => ({
        seller: seller.sellerName, activeLeads: seller.activeLeads, newLeads: seller.newLeads, followUps: seller.followUps,
        overdueFollowUps: seller.overdueFollowUps, recoveryStarted72h: seller.recoveryStarted72h, salesCount: seller.salesCount,
        paidSalesCount: seller.paidSalesCount, revenue: Number(seller.revenue), currency: seller.currency
      }));
      return finish(await reportDownloadResponse("sellers", dateTag, filters, columns, rows, generatedAt, sellerName, setPhase));
    } else {
      const columns: OpsXlsxColumn[] = [
        { header: "Cliente", key: "customer", width: 28, wrapText: true }, { header: "Vendedor", key: "seller", width: 24, wrapText: true },
        { header: "Etapa", key: "stage", width: 20 }, { header: "Canal", key: "channel", width: 16 },
        { header: "Próximo seguimiento", key: "nextActionAt", kind: "date", width: 24 }, { header: "Cumplimiento", key: "state", width: 18 },
        { header: "Última actividad", key: "lastActivityAt", kind: "date", width: 24 }
      ];
      const rows = filteredConversations(conversations, filters, true)
        .filter((row: Record<string, any>) => row.nextActionAt || (row.commercialTimeline || []).some((event: Record<string, any>) => event.type === "commercial_follow_up_completed"))
        .map((row: Record<string, any>) => {
          const dueAt = row.nextActionAt ? new Date(row.nextActionAt).getTime() : Number.NaN;
          const state = !row.nextActionAt ? "Completado" : dueAt < generatedAt.getTime() ? "Vencido" : new Date(row.nextActionAt).toDateString() === generatedAt.toDateString() ? "Hoy" : "Próximo";
          return {
            customer: row.contact?.name || "", seller: row.assignedSellerName || "", stage: humanize(row.leadStatus || ""),
            channel: humanize(row.channelType || ""), nextActionAt: row.nextActionAt || "", state,
            lastActivityAt: row.lastCommercialActivityAt || row.lastMessageAt || ""
          };
        });
      return finish(await reportDownloadResponse("followups", dateTag, filters, columns, rows, generatedAt, sellerName, setPhase));
    }
  } catch {
    return finish(NextResponse.json({ error: "ops_report_generation_failed" }, { status: 502 }), "ops_report_generation_failed");
  }
}
