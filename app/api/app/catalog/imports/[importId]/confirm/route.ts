import { NextRequest, NextResponse } from "next/server";
import { confirmPortalCatalogImport, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function actorFromTenantContext(tenantContext: Awaited<ReturnType<typeof resolveAppTenant>>) {
  if (!("ctx" in tenantContext) || !tenantContext.ctx) return undefined;
  const sessionUser = tenantContext.ctx.session?.user;
  return {
    id: tenantContext.ctx.portalActorId || tenantContext.ctx.userId || null,
    name: sessionUser?.name || null
  };
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ importId: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  const { importId } = await params;

  try {
    const result = await confirmPortalCatalogImport(tenantContext.tenantId, importId, actorFromTenantContext(tenantContext));
    return noStore(NextResponse.json({ ok: true, import: result.data }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "catalog_import_confirm_failed"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
