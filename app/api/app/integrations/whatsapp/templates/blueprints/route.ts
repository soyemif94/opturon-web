import { NextResponse } from "next/server";
import { getPortalWhatsAppTemplateBlueprints, isBackendConfigured } from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

export async function GET() {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json({
      success: true,
      data: {
        tenantId: auth.ctx.tenantId,
        blueprints: []
      }
    });
  }

  try {
    const result = await getPortalWhatsAppTemplateBlueprints(auth.ctx.tenantId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "whatsapp_template_blueprints_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: 502 }
    );
  }
}
