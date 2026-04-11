import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  patchPortalAutomationTemplate
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

type Params = {
  params: Promise<{ key: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json(
      { error: "backend_not_configured", detail: "Las automatizaciones requieren backend persistente." },
      { status: 503 }
    );
  }

  const { key } = await params;
  const body = (await request.json().catch(() => null)) as { enabled?: boolean } | null;

  try {
    const result = await patchPortalAutomationTemplate(auth.ctx.tenantId, String(key || "").trim(), {
      enabled: body?.enabled === true
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "automation_template_update_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
