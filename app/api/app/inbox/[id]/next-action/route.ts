import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { appendAuditLog, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const patchSchema = z.object({
  nextActionAt: z.string().datetime().nullable().optional(),
  nextActionNote: z.string().max(2000).nullable().optional(),
  completed: z.boolean().optional()
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
  const actorUserId = tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (!tenantContext.readOnly && !isBackendConfigured()) {
    return NextResponse.json({ error: "portal_inbox_backend_unavailable" }, { status: 503 });
  }

  if (!tenantContext.readOnly && isBackendConfigured()) {
    try {
      const response = await fetch(`${process.env.BACKEND_BASE_URL || process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://opturon-api.onrender.com"}/portal/tenants/${tenantContext.tenantId}/conversations/${id}/next-action`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-portal-key": String(process.env.PORTAL_INTERNAL_KEY || ""),
          ...(actorUserId ? { "x-portal-actor-id": actorUserId } : {}),
          "x-active-tenant-id": tenantContext.tenantId
        },
        body: JSON.stringify(parsed.data),
        cache: "no-store"
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(String(json?.error || "backend_fetch_failed")) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return NextResponse.json(json.data, { headers: { "Cache-Control": "no-store" } });
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

  const previousNextActionAt = conversation.nextActionAt || null;
  const previousNextActionNote = conversation.nextActionNote || null;
  if (parsed.data.completed === true) {
    conversation.nextActionAt = null;
  } else if (Object.prototype.hasOwnProperty.call(parsed.data, "nextActionAt")) {
    conversation.nextActionAt = parsed.data.nextActionAt || null;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, "nextActionNote")) {
    const safeNote = parsed.data.nextActionNote ? parsed.data.nextActionNote.trim() : "";
    conversation.nextActionNote = safeNote || null;
  }
  const actor = data.users.find((item) => item.id === actorUserId);
  const now = new Date().toISOString();
  const timeline = Array.isArray((conversation as typeof conversation & { commercialTimeline?: unknown[] }).commercialTimeline)
    ? (conversation as typeof conversation & { commercialTimeline: Array<Record<string, unknown>> }).commercialTimeline
    : [];
  const commercialEvents: Array<Record<string, unknown>> = [];
  if (parsed.data.completed === true && previousNextActionAt) {
    commercialEvents.push({
      id: `event-${Date.now()}-followup-completed`,
      type: "commercial_follow_up_completed",
      data: { previousFollowUpAt: previousNextActionAt, completedAt: now, changedBy: actor?.id || null, changedByName: actor?.name || null },
      createdAt: now
    });
  } else if (previousNextActionAt !== (conversation.nextActionAt || null)) {
    commercialEvents.push({
      id: `event-${Date.now()}-followup`,
      type: "commercial_follow_up_updated",
      data: { previousFollowUpAt: previousNextActionAt, followUpAt: conversation.nextActionAt || null, changedBy: actor?.id || null, changedByName: actor?.name || null },
      createdAt: now
    });
  }
  if (previousNextActionNote !== (conversation.nextActionNote || null)) {
    commercialEvents.push({
      id: `event-${Date.now()}-note`,
      type: "commercial_note_updated",
      data: { previousText: previousNextActionNote, text: conversation.nextActionNote || null, changedBy: actor?.id || null, changedByName: actor?.name || null },
      createdAt: now
    });
  }
  if (commercialEvents.length) {
    (conversation as typeof conversation & { commercialTimeline?: Array<Record<string, unknown>> }).commercialTimeline = [
      ...commercialEvents,
      ...timeline
    ].slice(0, 30);
    (conversation as typeof conversation & { lastCommercialActivityAt?: string }).lastCommercialActivityAt = now;
  }
  writeSaasData(data);

  appendAuditLog({
    tenantId: tenantContext.tenantId,
    userId: actorUserId,
    action: "inbox_next_action",
    entity: "conversation",
    entityId: conversation.id,
    metadata: {
      nextActionAt: conversation.nextActionAt || null,
      nextActionNote: conversation.nextActionNote || null
    }
  });
  touchTenantActivity(tenantContext.tenantId);

  return NextResponse.json({
    ok: true,
    conversation: {
      id: conversation.id,
      nextActionAt: conversation.nextActionAt || null,
      nextActionNote: conversation.nextActionNote || null
    }
  });
}
