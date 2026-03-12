import { NextRequest, NextResponse } from "next/server";
import {
  connectPortalWhatsAppManual,
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
      { error: "backend_not_configured", detail: "La conexion manual requiere backend persistente." },
      { status: 503 }
    );
  }

  let payload: {
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

  try {
    const result = await connectPortalWhatsAppManual(auth.ctx.tenantId, {
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
