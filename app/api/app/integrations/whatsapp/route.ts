import { NextResponse } from "next/server";
import { getPortalTenantContext, isBackendConfigured } from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

export async function GET() {
  const auth = await requireAppApi();
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    const status = buildWhatsAppConnectionStatus({ fallbackReason: "backend_not_configured" });
    return NextResponse.json({
      success: true,
      data: status
    });
  }

  try {
    const result = await getPortalTenantContext(auth.ctx.tenantId);
    const status = buildWhatsAppConnectionStatus({ context: result.data });
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    const status = buildWhatsAppConnectionStatus({
      fallbackReason: error instanceof Error ? error.message : "portal_tenant_context_failed"
    });
    return NextResponse.json({
      success: true,
      data: status
    });
  }
}
