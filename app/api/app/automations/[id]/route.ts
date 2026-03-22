import { NextRequest, NextResponse } from "next/server";
import {
  deletePortalAutomation,
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  patchPortalAutomation
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

type Params = {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { enabled?: boolean } | null;

  try {
    const result = await patchPortalAutomation(auth.ctx.tenantId, String(id || "").trim(), {
      enabled: body?.enabled === true
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "automation_update_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
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

  const { id } = await params;

  try {
    const result = await deletePortalAutomation(auth.ctx.tenantId, String(id || "").trim());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "automation_delete_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
