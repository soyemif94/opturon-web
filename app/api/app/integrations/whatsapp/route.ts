import { NextResponse } from "next/server";
import { getPortalTenantContext, getPortalWhatsAppEmbeddedSignupStatus, isBackendConfigured } from "@/lib/api";
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
    const [result, onboarding] = await Promise.all([
      getPortalTenantContext(auth.ctx.tenantId),
      getPortalWhatsAppEmbeddedSignupStatus(auth.ctx.tenantId).catch(() => null)
    ]);
    const status = buildWhatsAppConnectionStatus({ context: result.data, onboarding: onboarding?.data || null });
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
