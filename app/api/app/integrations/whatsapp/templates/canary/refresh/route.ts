import { NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, refreshPortalWhatsAppTemplateCanary } from "@/lib/api";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export async function POST() {
  const auth = await requireOpturonAdminApi();
  if (auth.error) return auth.error;
  const tenantId = String(auth.ctx.tenantId || "").trim();
  const actorId = String(auth.ctx.portalActorId || auth.ctx.session?.user?.portalActorId || "").trim();
  if (!tenantId || !actorId) return NextResponse.json({ error: "missing_canary_authority" }, { status: 403 });
  if (!isBackendConfigured()) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  try {
    return NextResponse.json(await refreshPortalWhatsAppTemplateCanary(tenantId, actorId));
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || { error: "whatsapp_canary_sync_failed" },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
