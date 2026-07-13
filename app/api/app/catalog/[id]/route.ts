import { NextRequest, NextResponse } from "next/server";
import {
  deletePortalProduct,
  getBackendErrorBody,
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
    if (body?.categoryId !== undefined) payload.categoryId = body.categoryId || null;
    if (body?.subcategory !== undefined) payload.subcategory = body.subcategory || null;
    if (body?.attributes !== undefined) payload.attributes = Array.isArray(body.attributes) ? body.attributes : [];
    if (body?.image !== undefined) payload.image = body.image || null;
    if (body?.expirationDate !== undefined) payload.expirationDate = body.expirationDate || null;
    if (body?.discountPercentage !== undefined) payload.discountPercentage = body.discountPercentage ?? null;
    if (body?.automationAttribution !== undefined) payload.automationAttribution = body.automationAttribution || null;
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  const { id } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";
  const body = force ? await request.json().catch(() => null) : null;

  try {
    const result = await deletePortalProduct(tenantContext.tenantId, id, {
      force,
      confirmForceDelete: body?.confirmForceDelete === true,
      acknowledgedReferences: body?.acknowledgedReferences === true,
      actor: {
        id: tenantContext.ctx.portalActorId || null,
        name: tenantContext.ctx.session?.user?.name || null
      }
    });
    return noStore(NextResponse.json({
      ok: true,
      productId: result.data.productId,
      deletionMode: result.data.deletionMode || "hard_delete",
      referencesPreserved: result.data.referencesPreserved === true
    }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error) as { error?: string; message?: string; details?: unknown } | undefined;
    return noStore(
      NextResponse.json(
        {
          error: backendBody?.error || (error instanceof Error ? error.message : "backend_delete_failed"),
          message: backendBody?.message || null,
          details: backendBody?.details || null
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
