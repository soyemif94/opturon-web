import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assignPortalConversationSeller, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { appendAuditLog, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const patchSchema = z.object({
  sellerUserId: z.string().uuid()
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
      const result = await assignPortalConversationSeller(tenantContext.tenantId, id, parsed.data.sellerUserId);
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
  const membership = data.memberships.find(
    (item) => item.userId === parsed.data.sellerUserId && item.tenantId === tenantContext.tenantId && item.role !== "viewer"
  );
  const user = membership ? data.users.find((item) => item.id === membership.userId) : undefined;
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "seller_user_not_found" }, { status: 422 });

  conversation.assignedTo = user.id;
  conversation.assignedSellerUserId = user.id;
  conversation.assignedSellerName = user.name;
  conversation.assignedSellerRole = membership?.role || "seller";
  writeSaasData(data);

  appendAuditLog({
    tenantId: tenantContext.tenantId,
    userId: tenantContext.ctx?.userId,
    action: "inbox_assign_seller",
    entity: "conversation",
    entityId: conversation.id
  });
  touchTenantActivity(tenantContext.tenantId);

  return NextResponse.json({
    ok: true,
    conversation: {
      id: conversation.id,
      assignedSellerUserId: user.id,
      assignedSellerName: user.name,
      assignedSellerRole: membership?.role || "seller",
      assignedTo: user.name
    }
  });
}
