import { NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPortalWhatsAppStatus, isBackendConfigured } from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

export async function GET() {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json({
      success: true,
      data: {
        ok: true,
        tenantId: auth.ctx.tenantId,
        clinicId: "",
        generatedAt: new Date().toISOString(),
        channel: {
          connected: false,
          provider: null,
          channelId: null,
          phoneNumberId: null,
          wabaId: null,
          displayPhoneNumber: null,
          verifiedName: null,
          status: null
        },
        botRuntime: { enabled: null },
        webhook: { lastReceived: null, events24h: 0 },
        messages: { lastInbound: null, lastOutbound: null, inbound24h: 0, outbound24h: 0 },
        jobs: { lastConversationReply: null },
        errors: { lastWebhookError: null, lastJobError: null },
        handoffs: {
          openCount: 0,
          blockedConversationCount: 0,
          explanation: "Si una conversacion esta derivada a humano, el bot no responde hasta cerrar handoff o reactivar bot."
        },
        botConfig: {
          mode: null,
          botName: null,
          hasCustomConfig: false,
          hasCustomGreeting: false,
          hasCustomFallback: false,
          hasCustomHandoff: false
        },
        badges: ["not_connected"]
      }
    });
  }

  try {
    const result = await getPortalWhatsAppStatus(auth.ctx.tenantId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      getBackendErrorBody(error) || {
        error: "whatsapp_status_failed",
        detail: error instanceof Error ? error.message : "unknown_error"
      },
      { status: getBackendErrorStatus(error) || 502 }
    );
  }
}
