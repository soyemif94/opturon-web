import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorStatus, isBackendConfigured, listPortalCatalogImports } from "@/lib/api";
import { getPortalInventoryReadActor, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  const limit = Number.parseInt(new URL(request.url).searchParams.get("limit") || "8", 10);

  try {
    const result = await listPortalCatalogImports(tenantContext.tenantId, { limit }, getPortalInventoryReadActor(tenantContext.ctx));
    return noStore(NextResponse.json({ ok: true, imports: result.data.imports || [] }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "catalog_imports_fetch_failed"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
