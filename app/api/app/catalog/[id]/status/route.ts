import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorStatus, isBackendConfigured, patchPortalProductStatus, type PortalProduct } from "@/lib/api";
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  const { id } = await params;

  try {
    const body = await request.json().catch(() => null);
    const result = await patchPortalProductStatus(tenantContext.tenantId, id, {
      status: String(body?.status || "")
    });
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
