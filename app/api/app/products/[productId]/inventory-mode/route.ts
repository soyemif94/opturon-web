import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, setPortalProductInventoryMode } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "inventory_backend_unavailable" }, { status: 503 }));
  }

  const { productId } = await params;
  try {
    const body = await request.json().catch(() => null);
    const mode = body?.mode === "lot_based" ? "lot_based" : "legacy";
    const result = await setPortalProductInventoryMode(
      tenantContext.tenantId,
      productId,
      mode,
      body?.initialLot && typeof body.initialLot === "object" ? body.initialLot : undefined
    );
    return noStore(NextResponse.json({ ok: true, product: result.data }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_update_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
