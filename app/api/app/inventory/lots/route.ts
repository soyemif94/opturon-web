import { NextRequest, NextResponse } from "next/server";
import {
  createPortalInventoryLot,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalInventoryLots,
  isBackendConfigured
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const result = await getPortalInventoryLots(tenantContext.tenantId, {
      productId: url.searchParams.get("productId") || undefined,
      status: url.searchParams.get("status") || undefined,
      expirationStatus: url.searchParams.get("expirationStatus") || undefined,
      warehouse: url.searchParams.get("warehouse") || undefined,
      expiresBefore: url.searchParams.get("expiresBefore") || undefined,
      expiresAfter: url.searchParams.get("expiresAfter") || undefined,
      search: url.searchParams.get("search") || undefined,
      pageSize: Number(url.searchParams.get("pageSize") || 100)
    });
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        lots: Array.isArray(result.data?.lots) ? result.data.lots : []
      })
    );
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await createPortalInventoryLot(tenantContext.tenantId, {
      productId: String(body?.productId || "").trim(),
      lotNumber: body?.lotNumber || null,
      supplierName: body?.supplierName || null,
      receivedAt: body?.receivedAt || null,
      manufacturedAt: body?.manufacturedAt || null,
      expiresAt: body?.expiresAt || null,
      quantity: Number(body?.quantity ?? body?.initialQuantity ?? 0),
      unitCost: body?.unitCost === "" ? null : body?.unitCost ?? null,
      warehouseName: body?.warehouseName || null,
      locationName: body?.locationName || null,
      notes: body?.notes || null,
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {}
    });
    return noStore(NextResponse.json({ ok: true, lot: result.data }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_create_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
