import { NextRequest, NextResponse } from "next/server";
import {
  connectPortalWhatsAppManual,
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
      { error: "backend_not_configured", detail: "La conexion manual requiere backend persistente." },
      { status: 503 }
    );
  }

  let payload: {
    tenantId?: string;
    wabaId?: string;
    phoneNumberId?: string;
    accessToken?: string;
    channelName?: string | null;
  } = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const tenantId = String(payload.tenantId || "").trim();
  if (!tenantId) {
    return NextResponse.json({ error: "missing_tenant_id", detail: "La conexion manual solo se ejecuta desde Admin Opturon con tenant explicito." }, { status: 400 });
  }

  try {
    const result = await connectPortalWhatsAppManual(tenantId, {
      wabaId: String(payload.wabaId || "").trim(),
      phoneNumberId: String(payload.phoneNumberId || "").trim(),
      accessToken: String(payload.accessToken || "").trim(),
      channelName: payload.channelName ? String(payload.channelName).trim() : null
    });
    return NextResponse.json(result, { status: result.data?.status === "connected" ? 200 : 202 });
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "whatsapp_manual_connect_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
