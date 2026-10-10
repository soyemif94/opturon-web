import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assignPortalConversationSeller, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { isOperationalPortalAssigneeRole } from "@/lib/portal-users";
import { resolveAppTenant } from "@/lib/saas/access";
import { canManageWorkspace } from "@/lib/app-permissions";
import { appendAuditLog, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const patchSchema = z.object({
  sellerUserId: z.string().uuid(),
  startRecovery: z.boolean().optional().default(false)
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
  if (parsed.data.startRecovery && !canManageWorkspace(tenantContext.ctx!)) {
    return NextResponse.json({ error: "recovery_supervisor_required" }, { status: 403 });
  }

  if (!tenantContext.readOnly && !isBackendConfigured()) {
    return NextResponse.json({ error: "portal_inbox_backend_unavailable" }, { status: 503 });
  }

  if (!tenantContext.readOnly && isBackendConfigured()) {
    try {
      const result = await assignPortalConversationSeller(
        tenantContext.tenantId,
        id,
        parsed.data.sellerUserId,
        tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId,
        parsed.data.startRecovery
      );
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
    (item) =>
      item.userId === parsed.data.sellerUserId &&
      item.tenantId === tenantContext.tenantId &&
      isOperationalPortalAssigneeRole(item.role)
  );
  const user = membership ? data.users.find((item) => item.id === membership.userId) : undefined;
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (!user) return NextResponse.json({ error: "seller_user_not_found" }, { status: 422 });

  const actorUserId = tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId;
  const previousSellerId = conversation.assignedSellerUserId || null;
  conversation.assignedTo = user.id;
  conversation.assignedSellerUserId = user.id;
  conversation.assignedSellerName = user.name;
  conversation.assignedSellerRole = membership?.role || "seller";
  if (previousSellerId !== user.id || parsed.data.startRecovery) {
    const actor = data.users.find((item) => item.id === actorUserId);
    const now = new Date().toISOString();
    const tracked = conversation as typeof conversation & {
      commercialTimeline?: Array<Record<string, unknown>>;
      lastReassignedAt?: string | null;
      recoveryStartedAt?: string | null;
      lastCommercialActivityAt?: string | null;
    };
    const timeline = Array.isArray(tracked.commercialTimeline) ? tracked.commercialTimeline : [];
    const previousSeller = data.users.find((item) => item.id === previousSellerId);
    const events: Array<Record<string, unknown>> = [];
    if (previousSellerId !== user.id) {
      const type = previousSellerId ? "seller_reassigned" : "seller_assigned";
      events.push({
        id: `event-${Date.now()}-assignment`,
        type,
        data: {
          fromSellerId: previousSellerId,
          fromSellerName: previousSeller?.name || null,
          toSellerId: user.id,
          toSellerName: user.name,
          changedBy: actor?.id || null,
          changedByName: actor?.name || null
        },
        createdAt: now
      });
      if (type === "seller_reassigned") tracked.lastReassignedAt = now;
    }
    if (parsed.data.startRecovery) {
      events.push({
        id: `event-${Date.now()}-recovery`,
        type: "recovery_started",
        data: {
          sellerId: user.id,
          sellerName: user.name,
          fromSellerId: previousSellerId,
          fromSellerName: previousSeller?.name || null,
          changedBy: actor?.id || null,
          changedByName: actor?.name || null,
          source: "ops"
        },
        createdAt: now
      });
      tracked.recoveryStartedAt = now;
    }
    tracked.commercialTimeline = [...events, ...timeline].slice(0, 30);
    tracked.lastCommercialActivityAt = now;
  }
  writeSaasData(data);

  appendAuditLog({
    tenantId: tenantContext.tenantId,
    userId: actorUserId,
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
      assignedTo: user.name,
      leadStatus: conversation.leadStatus || "NEW"
    }
  });
}
