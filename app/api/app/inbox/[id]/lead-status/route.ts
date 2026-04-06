import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBackendErrorStatus, isBackendConfigured, patchPortalConversationLeadStatus } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { appendAuditLog, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const patchSchema = z.object({
  leadStatus: z.enum(["NEW", "IN_CONVERSATION", "FOLLOW_UP", "CLOSED"])
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);

  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1",
    requireWrite: true
  });
  if (tenantContext.error) return tenantContext.error;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (!tenantContext.readOnly && !isBackendConfigured()) {
    return NextResponse.json({ error: "portal_inbox_backend_unavailable" }, { status: 503 });
  }

  if (!tenantContext.readOnly && isBackendConfigured()) {
    try {
      const result = await patchPortalConversationLeadStatus(tenantContext.tenantId, id, parsed.data.leadStatus);
      return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "backend_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      );
    }
  }

  const data = readSaasData();
  const conversation = data.conversations.find((item) => item.id === id && item.tenantId === tenantContext.tenantId);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  conversation.leadStatus = parsed.data.leadStatus;
  conversation.lastMessageAt = new Date().toISOString();
  writeSaasData(data);

  appendAuditLog({
    tenantId: tenantContext.tenantId,
    userId: tenantContext.ctx?.userId,
    action: "inbox_lead_status",
    entity: "conversation",
    entityId: conversation.id,
    metadata: { leadStatus: parsed.data.leadStatus }
  });
  touchTenantActivity(tenantContext.tenantId);

  return NextResponse.json({
    ok: true,
    conversation: {
      id: conversation.id,
      leadStatus: parsed.data.leadStatus
    }
  });
}
