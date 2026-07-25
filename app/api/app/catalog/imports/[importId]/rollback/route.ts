import { NextRequest, NextResponse } from "next/server";
import { executePortalCatalogImportRollback, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ importId: string }> }) {
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
  }

  const { importId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const result = await executePortalCatalogImportRollback(tenantContext.tenantId, importId, {
      idempotencyKey: String(body?.idempotencyKey || ""),
      force: body?.force === true,
      confirmForceDelete: body?.confirmForceDelete === true,
      actor: {
        id: tenantContext.ctx.portalActorId || null,
        name: tenantContext.ctx.session?.user?.name || null
      }
    });
    return noStore(NextResponse.json({ ok: true, result: result.data }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "catalog_import_rollback_failed"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
