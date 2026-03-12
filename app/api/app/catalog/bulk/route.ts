import { NextRequest, NextResponse } from "next/server";
import { createPortalProductsBulk, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  try {
    const body = await request.json().catch(() => null);
    const result = await createPortalProductsBulk(tenantContext.tenantId, body || {});
    return noStore(
      NextResponse.json({
        ok: true,
        created: result.data.created,
        failed: result.data.failed,
        results: result.data.results
      })
    );
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "backend_bulk_create_failed"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
