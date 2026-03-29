import { NextRequest, NextResponse } from "next/server";
import {
  connectPortalInstagram,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalInstagramStatus,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

export async function GET() {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json(
      {
        success: true,
        data: {
          tenantId: auth.ctx.tenantId,
          clinicId: null,
          state: "not_connected",
          channel: null,
          channels: []
        }
      },
      { status: 200 }
    );
  }

  try {
    const result = await getPortalInstagramStatus(auth.ctx.tenantId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "instagram_status_failed",
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
      { error: "backend_not_configured", detail: "Instagram requiere backend persistente." },
      { status: 503 }
    );
  }

  let payload: { code?: string; redirectUri?: string } = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const result = await connectPortalInstagram(auth.ctx.tenantId, {
      code: String(payload.code || "").trim(),
      redirectUri: String(payload.redirectUri || "").trim()
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "instagram_connect_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
