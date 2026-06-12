import { NextRequest, NextResponse } from "next/server";
import {
  createPortalWhatsAppTemplateFromBlueprint,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalWhatsAppTemplates,
  isBackendConfigured,
  syncPortalWhatsAppTemplates
} from "@/lib/api";
import { requireAppApi, requireOpturonAdminApi } from "@/lib/saas/access";

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
        templates: []
      }
    });
  }

  try {
    const result = await getPortalWhatsAppTemplates(auth.ctx.tenantId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "whatsapp_templates_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOpturonAdminApi();
  if (auth.error) return auth.error;

  if (!isBackendConfigured()) {
    return NextResponse.json(
      { error: "backend_not_configured", detail: "Templates de WhatsApp requieren backend persistente." },
      { status: 503 }
    );
  }

  let payload: { tenantId?: string; action?: string; templateKey?: string; language?: string } = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const tenantId = String(payload.tenantId || "").trim();
  if (!tenantId) {
    return NextResponse.json({ error: "missing_tenant_id", detail: "Las mutaciones de templates solo se ejecutan desde Admin Opturon con tenant explicito." }, { status: 400 });
  }

  try {
    if (payload.action === "sync") {
      const result = await syncPortalWhatsAppTemplates(tenantId);
      return NextResponse.json(result);
    }

    const result = await createPortalWhatsAppTemplateFromBlueprint(tenantId, {
      templateKey: String(payload.templateKey || "").trim(),
      language: payload.language ? String(payload.language).trim() : undefined
    });
    return NextResponse.json(result, { status: result.data?.created === false ? 200 : 201 });
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "whatsapp_template_mutation_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
