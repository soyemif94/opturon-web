import { NextRequest, NextResponse } from "next/server";
import {
  connectPortalInstagram,
  disconnectPortalInstagram,
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

  let payload: {
    code?: string;
    redirectUri?: string;
    selectionToken?: string;
    selectedPageId?: string;
    selectedInstagramUserId?: string;
  } = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const result = await connectPortalInstagram(auth.ctx.tenantId, {
      code: String(payload.code || "").trim(),
      redirectUri: String(payload.redirectUri || "").trim(),
      selectionToken: String(payload.selectionToken || "").trim(),
      selectedPageId: String(payload.selectedPageId || "").trim(),
      selectedInstagramUserId: String(payload.selectedInstagramUserId || "").trim()
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

export async function DELETE(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  let payload: { channelId?: string } = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const channelId = String(payload.channelId || "").trim();
  if (!channelId) {
    return NextResponse.json({ error: "missing_instagram_channel_id" }, { status: 400 });
  }

  try {
    const result = await disconnectPortalInstagram(auth.ctx.tenantId, { channelId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "instagram_disconnect_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
