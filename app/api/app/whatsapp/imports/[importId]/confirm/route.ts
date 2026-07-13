import { NextRequest, NextResponse } from "next/server";
import { confirmPortalWhatsAppChatImport, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params;
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "whatsapp_import_backend_unavailable" }, { status: 503 }));
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const result = await confirmPortalWhatsAppChatImport(
      tenantContext.tenantId,
      importId,
      {
        selectedContactId:
          typeof payload?.selectedContactId === "string" && payload.selectedContactId.trim()
            ? payload.selectedContactId.trim()
            : null
      },
      actorFromTenantContext(tenantContext)
    );
    return noStore(NextResponse.json({ ok: true, import: result.data, idempotent: Boolean(result.idempotent) }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "whatsapp_import_confirm_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
