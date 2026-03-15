import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalWhatsAppDefaultChannelSettings,
  isBackendConfigured,
  patchPortalWhatsAppDefaultChannelSettings
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
          defaultChannelId: null,
          defaultChannel: null,
          activeChannels: [],
          strategy: "backend_not_configured",
          source: "none",
          reason: "backend_not_configured"
        }
      },
      { status: 200 }
    );
  }

  try {
    const result = await getPortalWhatsAppDefaultChannelSettings(auth.ctx.tenantId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "whatsapp_default_channel_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json(
      { error: "backend_not_configured", detail: "La seleccion de canal requiere backend persistente." },
      { status: 503 }
    );
  }

  let payload: { channelId?: string } = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const result = await patchPortalWhatsAppDefaultChannelSettings(auth.ctx.tenantId, {
      channelId: String(payload.channelId || "").trim()
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "whatsapp_default_channel_update_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
