import { NextRequest, NextResponse } from "next/server";
import {
  createPortalAutomation,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalAutomations,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

export async function GET() {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ success: true, data: { automations: [] } });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json(
      { error: "backend_not_configured", detail: "Las automatizaciones requieren backend persistente." },
      { status: 503 }
    );
  }

  try {
    const result = await getPortalAutomations(auth.ctx.tenantId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "automations_fetch_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}

export async function POST(request: NextRequest) {
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

  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        trigger?: { type?: string; keyword?: string | null };
        actions?: Array<{ type?: string; message?: string | null; tag?: string | null }>;
        enabled?: boolean;
      }
    | null;

  try {
    const result = await createPortalAutomation(auth.ctx.tenantId, {
      name: String(body?.name || "").trim(),
      trigger: {
        type: String(body?.trigger?.type || "").trim(),
        keyword: body?.trigger?.keyword ? String(body.trigger.keyword).trim() : null
      },
      actions: Array.isArray(body?.actions)
        ? body.actions.map((action) => ({
            type: String(action?.type || "").trim(),
            message: action?.message ? String(action.message).trim() : null,
            tag: action?.tag ? String(action.tag).trim() : null
          }))
        : [],
      enabled: body?.enabled !== false
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "automation_create_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
