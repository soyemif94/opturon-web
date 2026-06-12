import { NextRequest, NextResponse } from "next/server";
import {
  discoverPortalWhatsAppAssets,
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured
} from "@/lib/api";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export async function POST(request: NextRequest) {
  const auth = await requireOpturonAdminApi();
  if (auth.error) return auth.error;

  if (!isBackendConfigured()) {
    return NextResponse.json(
      { error: "backend_not_configured", detail: "La autodeteccion requiere backend persistente." },
      { status: 503 }
    );
  }

  let payload: { tenantId?: string; accessToken?: string } = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const tenantId = String(payload.tenantId || "").trim();
  if (!tenantId) {
    return NextResponse.json({ error: "missing_tenant_id", detail: "La autodeteccion solo se ejecuta desde Admin Opturon con tenant explicito." }, { status: 400 });
  }

  try {
    const result = await discoverPortalWhatsAppAssets(tenantId, {
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
