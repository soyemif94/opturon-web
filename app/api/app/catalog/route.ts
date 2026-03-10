import { NextRequest, NextResponse } from "next/server";
import {
  createPortalProduct,
  getBackendErrorStatus,
  getPortalProducts,
  isBackendConfigured,
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

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
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
    const result = await getPortalProducts(tenantContext.tenantId);
    const products = Array.isArray(result.data?.products) ? result.data.products.map(serializeProduct) : [];
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        products
      })
    );
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

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await createPortalProduct(tenantContext.tenantId, {
      name: String(body?.name || "").trim(),
      description: body?.description || null,
      price: Number(body?.price || 0),
      currency: String(body?.currency || "ARS"),
      stock: Number(body?.stock ?? body?.stockQty ?? 0),
      sku: body?.sku || null,
      status:
        typeof body?.status === "string"
          ? body.status
          : body?.active === false
            ? "inactive"
            : "active"
    });

    return noStore(NextResponse.json({ ok: true, product: serializeProduct(result.data) }, { status: 201 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "backend_create_failed"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
