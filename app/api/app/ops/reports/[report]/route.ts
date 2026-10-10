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
  format: z.enum(["csv", "json"]).optional()
});

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function csvResponse(report: string, dateTag: string, csv: string) {
  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="opturon-${report}-${dateTag}.csv"`,
      "Cache-Control": "private, no-store",
      "Pragma": "no-cache"
    }
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
  const cookieStore = await cookies();
  if (!hasOpsAccessCookie(cookieStore)) return noStore(NextResponse.json({ error: "ops_access_required" }, { status: 403 }));

  const { report } = await params;
  if (!["sales", "sellers", "followups", "inventory", "movements", "expirations"].includes(report)) {
    return noStore(NextResponse.json({ error: "ops_report_not_found" }, { status: 404 }));
  }
  const requiredModule: "sales" | "orders" | "ops" | "inventory" =
    report === "sales" ? "sales" : report === "sellers" ? "orders" : ["inventory", "movements", "expirations"].includes(report) ? "inventory" : "ops";
  const guard = await requireAppModuleApi(requiredModule, { permission: "manage_workspace" });
  if (guard.error) return guard.error;
  if (report === "sales") {
    const ordersGuard = await requireAppModuleApi("orders", { permission: "manage_workspace" });
    if (ordersGuard.error) return ordersGuard.error;
  }
  const tenantContext = await resolveAppTenant({ permission: "manage_workspace" });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return noStore(NextResponse.json({ error: "ops_report_backend_unavailable" }, { status: 503 }));

  const parsed = filterSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!parsed.success) return noStore(NextResponse.json({ error: "invalid_report_filters" }, { status: 400 }));
  const filters = parsed.data;
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    return noStore(NextResponse.json({ error: "invalid_report_date_range" }, { status: 400 }));
  }

  try {
    const inventoryActor = ["inventory", "movements", "expirations"].includes(report)
      ? getPortalInventoryReadActor(guard.ctx || {})
      : null;
    if (report === "inventory") {
      const pageSize = 100;
      const first = await getPortalInventoryProducts(tenantContext.tenantId, { search: filters.product, page: 1, pageSize }, inventoryActor!);
      const products = [...(first.data?.products || [])];
      const total = Number(first.data?.total || products.length);
      const pages = Math.min(Math.ceil(total / pageSize), 100);
      for (let page = 2; page <= pages; page += 1) {
        const result = await getPortalInventoryProducts(tenantContext.tenantId, { search: filters.product, page, pageSize }, inventoryActor!);
        products.push(...(result.data?.products || []));
      }
      if (total > pageSize * 100) return noStore(NextResponse.json({ error: "report_too_large_apply_product_filter" }, { status: 413 }));
      const rows = products.map((product) => [product.name, product.sku || "", product.categoryName || "", product.stock, product.stockState || "", product.locationName || "", product.lastMovementAt || ""]);
      return csvResponse("inventory", filters.dateFrom || new Date().toISOString().slice(0, 10), buildCsv(["producto", "sku", "categoría", "stock", "estado_stock", "ubicación", "último_movimiento"], rows));
    }
    if (report === "movements") {
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
      if (total > pageSize * 100) return noStore(NextResponse.json({ error: "report_too_large_apply_date_or_product_filter" }, { status: 413 }));
      const rows = items.map((item) => [item.createdAt, item.movementType, item.productName || "", item.productSku || "", item.quantity, item.quantityBefore || "", item.quantityAfter || "", item.reason || "", item.actorName || item.createdBy || "", item.locationName || "", item.lotNumber || ""]);
      return csvResponse("movimientos", filters.dateFrom || new Date().toISOString().slice(0, 10), buildCsv(["fecha", "tipo", "producto", "sku", "cantidad", "stock_anterior", "stock_posterior", "motivo", "usuario", "ubicación", "lote"], rows));
    }
    if (report === "expirations") {
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
      if (lots.length >= 250) return noStore(NextResponse.json({ error: "report_too_large_apply_expiration_product_or_supplier_filter" }, { status: 413 }));
      const rows = lots.map((lot) => [lot.productName || "", lot.productSku || "", lot.lotNumber || "", lot.expiresAt || "", lot.expirationStatus, lot.daysUntilExpiration ?? "", lot.availableQuantity, lot.supplierName || "", lot.warehouseName || "", lot.locationName || "", lot.unitCost ?? ""]);
      return csvResponse("vencimientos", filters.dateFrom || new Date().toISOString().slice(0, 10), buildCsv(["producto", "sku", "lote", "vence", "estado", "días_hasta_vencer", "cantidad_disponible", "proveedor", "depósito", "ubicación", "costo_unitario"], rows));
    }
    const [conversationsResult, ordersResult, usersResult] = await Promise.all([
      report === "sales" && filters.format !== "json" ? Promise.resolve(null) : getPortalConversations(tenantContext.tenantId, { visibility: "active", channel: "all" }),
      report === "followups" ? Promise.resolve(null) : getPortalOrders(tenantContext.tenantId),
      report === "sellers" ? getPortalUsers(tenantContext.tenantId) : Promise.resolve(null)
    ]);
    const conversations = conversationsResult?.data?.conversations || [];
    const orders = ordersResult?.data?.orders || [];
    const sellerDirectory = (usersResult?.data?.users || [])
      .filter((user) => isOperationalPortalAssigneeUser(user))
      .map((user) => ({ id: String(user.id), name: String(user.name || "Vendedor") }));
    const dateTag = filters.dateFrom || new Date().toISOString().slice(0, 7);
    let filename = `opturon-${report}-${dateTag}.csv`;
    let csv: string;

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
        return noStore(NextResponse.json({
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
      const rows = selectedOrders.map((order) => [
        order.createdAt,
        order.id,
        order.sellerNameSnapshot || order.seller?.name || "",
        order.customerName || order.contact?.name || "",
        order.orderStatus,
        order.paymentStatus,
        order.source || "",
        order.total,
        order.currency,
        (order.items || []).map((item: Record<string, unknown>) => `${item.nameSnapshot || "Producto"} × ${item.quantity || 0}`).join("; ")
      ]);
      csv = buildCsv(["fecha", "operacion", "vendedor", "cliente", "estado", "cobro", "canal", "importe", "moneda", "productos"], rows);
    } else if (report === "sellers") {
      const filteredLeads = filteredConversations(conversations, filters);
      const filteredSales = filteredOrders(orders, filters);
      const sellerSummary = summarizeSellerRows(filteredLeads, filteredSales, new Date(), sellerDirectory).map((seller) => ({
        ...seller,
        averageTicket: seller.paidSalesCount ? seller.revenue / seller.paidSalesCount : 0
      }));
      if (filters.format === "json") {
        return noStore(NextResponse.json({ sellers: sellerSummary }));
      }
      const rows = sellerSummary.map((seller) => [
        seller.sellerName,
        seller.activeLeads,
        seller.newLeads,
        seller.followUps,
        seller.overdueFollowUps,
        seller.recoveryStarted72h,
        seller.salesCount,
        seller.paidSalesCount,
        seller.revenue,
        seller.currency
      ]);
      filename = `opturon-vendedores-${dateTag}.csv`;
      csv = buildCsv(["vendedor", "leads_activos", "nuevos", "seguimientos_activos", "vencidos", "recuperaciones_72h", "operaciones", "operaciones_cobradas", "importe_cobrado", "moneda"], rows);
    } else {
      const rows = filteredConversations(conversations, filters, true)
        .filter((row: Record<string, any>) => row.nextActionAt || (row.commercialTimeline || []).some((event: Record<string, any>) => event.type === "commercial_follow_up_completed"))
        .map((row: Record<string, any>) => {
          const dueAt = row.nextActionAt ? new Date(row.nextActionAt).getTime() : Number.NaN;
          const state = !row.nextActionAt ? "completado" : dueAt < Date.now() ? "vencido" : new Date(row.nextActionAt).toDateString() === new Date().toDateString() ? "hoy" : "próximo";
          return [row.contact?.name || "", row.assignedSellerName || "", row.leadStatus || "", row.channelType || "", row.nextActionAt || "", state, row.lastCommercialActivityAt || row.lastMessageAt || ""];
        });
      filename = `opturon-seguimientos-${dateTag}.csv`;
      csv = buildCsv(["cliente", "vendedor", "etapa", "canal", "fecha_proxima_accion", "estado", "ultima_actividad"], rows);
    }

    return csvResponse(filename.replace(/^opturon-/, "").replace(/-.*$/, ""), dateTag, csv);
  } catch {
    console.warn("ops_report_generation_failed", {
      route: "/api/app/ops/reports/[report]",
      report,
      status: 502,
      errorCode: "report_generation_failed"
    });
    return noStore(NextResponse.json({ error: "ops_report_generation_failed" }, { status: 502 }));
  }
}
