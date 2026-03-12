import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBackendErrorStatus, isBackendConfigured, sendPortalMessage } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { appendAuditLog, newId, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const schema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1).max(2000)
});

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1",
    requireWrite: true
  });
  if (tenantContext.error) return tenantContext.error;

  if (!tenantContext.readOnly && !isBackendConfigured()) {
    return NextResponse.json(
      {
        error: "portal_messages_backend_unavailable"
      },
      { status: 503 }
    );
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (!tenantContext.readOnly && isBackendConfigured()) {
    try {
      const result = await sendPortalMessage(tenantContext.tenantId, parsed.data);
      return NextResponse.json({ ok: true, message: result.data.message }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "backend_fetch_failed"
        },
        {
          status: getBackendErrorStatus(error) || 502
        }
      );
    }
  }

  const data = readSaasData();
  const conversation = data.conversations.find((item) => item.id === parsed.data.conversationId && item.tenantId === tenantContext.tenantId);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const now = new Date().toISOString();
  const message = {
    id: newId("msg"),
    tenantId: tenantContext.tenantId,
    conversationId: conversation.id,
    direction: "outbound" as const,
    text: parsed.data.text,
    timestamp: now,
    status: "sent" as const,
    providerMessageId: undefined
  };

  data.messages.push(message);
  conversation.lastMessageAt = now;
  conversation.status = "open";
  writeSaasData(data);

  appendAuditLog({
    tenantId: tenantContext.tenantId,
    userId: tenantContext.ctx?.userId,
    action: "message_outbound_created",
    entity: "message",
    entityId: message.id
  });
  touchTenantActivity(tenantContext.tenantId);

  return NextResponse.json({ ok: true, message }, { status: 201 });
}
