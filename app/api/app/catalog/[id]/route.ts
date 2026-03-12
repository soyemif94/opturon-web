import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorStatus,
  getPortalProductDetail,
  isBackendConfigured,
  patchPortalProduct,
  type PortalProduct
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function serializeProduct(product: PortalProduct) {
  return {
    ...product,
    stockQty: product.stock,
    active: product.status === "active"
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantContext = await resolveAppTenant({
    requestedTenantId: new URL(request.url).searchParams.get("tenantId") || undefined,
    demo: new URL(request.url).searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  const { id } = await params;

  try {
    const result = await getPortalProductDetail(tenantContext.tenantId, id);
    return noStore(NextResponse.json({ product: serializeProduct(result.data) }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "backend_fetch_failed"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  const { id } = await params;

  try {
    const body = await request.json().catch(() => null);
    const payload: Record<string, unknown> = {};
    if (body?.name !== undefined) payload.name = String(body.name || "").trim();
    if (body?.description !== undefined) payload.description = body.description || null;
    if (body?.price !== undefined) payload.price = Number(body.price);
    if (body?.currency !== undefined) payload.currency = String(body.currency || "ARS");
    if (body?.stock !== undefined || body?.stockQty !== undefined) payload.stock = Number(body.stock ?? body.stockQty);
    if (body?.sku !== undefined) payload.sku = body.sku || null;
    if (body?.status !== undefined) payload.status = String(body.status);
    if (body?.active !== undefined && body?.status === undefined) payload.status = body.active ? "active" : "inactive";

    const result = await patchPortalProduct(tenantContext.tenantId, id, payload);
    return noStore(NextResponse.json({ ok: true, product: serializeProduct(result.data) }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "backend_update_failed"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
