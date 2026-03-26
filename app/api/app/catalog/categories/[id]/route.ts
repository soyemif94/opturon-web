import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorStatus, isBackendConfigured, patchPortalProductCategory } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
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
    if (body?.isActive !== undefined) payload.isActive = body.isActive === true;

    const result = await patchPortalProductCategory(tenantContext.tenantId, id, payload);
    return noStore(NextResponse.json({ ok: true, category: result.data }));
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
