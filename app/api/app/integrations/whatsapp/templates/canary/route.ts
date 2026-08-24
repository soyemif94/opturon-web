import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPortalWhatsAppTemplateCanary, isBackendConfigured, sendPortalWhatsAppTemplateCanary } from "@/lib/api";
import { requireOpturonAdminApi } from "@/lib/saas/access";

async function authority() {
  const auth = await requireOpturonAdminApi();
  if (auth.error) return { error: auth.error };
  const tenantId = String(auth.ctx.tenantId || "").trim();
  const actorId = String(auth.ctx.portalActorId || auth.ctx.session?.user?.portalActorId || "").trim();
  if (!tenantId || !actorId) return { error: NextResponse.json({ error: "missing_canary_authority" }, { status: 403 }) };
  if (!isBackendConfigured()) return { error: NextResponse.json({ error: "backend_not_configured" }, { status: 503 }) };
  return { tenantId, actorId };
}

export async function GET() {
  const auth = await authority();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await getPortalWhatsAppTemplateCanary(auth.tenantId!, auth.actorId!));
  } catch (error) {
    return NextResponse.json(getBackendErrorBody(error) || { error: "whatsapp_canary_load_failed" }, { status: getBackendErrorStatus(error) || 502 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authority();
  if (auth.error) return auth.error;
  const payload = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(await sendPortalWhatsAppTemplateCanary(auth.tenantId!, auth.actorId!, {
      templateId: String(payload.templateId || ""), recipientId: String(payload.recipientId || ""),
      variables: payload.variables && typeof payload.variables === "object" ? payload.variables : {},
      idempotencyKey: String(payload.idempotencyKey || "")
    }));
  } catch (error) {
    return NextResponse.json(getBackendErrorBody(error) || { error: "whatsapp_canary_send_failed" }, { status: getBackendErrorStatus(error) || 502 });
  }
}
