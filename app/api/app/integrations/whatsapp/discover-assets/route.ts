import { NextRequest, NextResponse } from "next/server";
import {
  discoverPortalWhatsAppAssets,
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

export async function POST(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json(
      { error: "backend_not_configured", detail: "La autodeteccion requiere backend persistente." },
      { status: 503 }
    );
  }

  let payload: { accessToken?: string } = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const result = await discoverPortalWhatsAppAssets(auth.ctx.tenantId, {
      accessToken: String(payload.accessToken || "").trim()
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "whatsapp_discover_assets_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
