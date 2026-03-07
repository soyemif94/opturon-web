import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPortalConversationDetail, isBackendConfigured, patchPortalConversation } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { appendAuditLog, getInboxConversationDetail, newId, readSaasData, touchTenantActivity, writeSaasData, inboxQuickReplies, inboxAiEvents } from "@/lib/saas/store";

const patchSchema = z.object({
  action: z.enum(["assign", "toggle_bot", "close", "reopen", "mark_hot", "unmark_hot", "mark_read", "mark_unread", "add_note", "add_task", "change_stage"]),
  assignedTo: z.string().optional(),
  botEnabled: z.boolean().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
  dueDate: z.string().optional(),
  stage: z.enum(["lead", "qualified", "proposal", "won", "lost"]).optional()
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);

  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;

  if (!tenantContext.readOnly && isBackendConfigured()) {
    const result = await getPortalConversationDetail(tenantContext.tenantId, id);
    return NextResponse.json(result.data, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }

  const detail = getInboxConversationDetail(tenantContext.tenantId, id);
  if (!detail) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  return NextResponse.json({
    readOnly: tenantContext.readOnly,
    ...detail,
    quickReplies: inboxQuickReplies(),
    aiEvents: inboxAiEvents(tenantContext.tenantId, id)
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

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

  if (!tenantContext.readOnly && isBackendConfigured()) {
    await patchPortalConversation(tenantContext.tenantId, id, parsed.data as Record<string, unknown>);
    return NextResponse.json({ ok: true });
  }

  const data = readSaasData();
  const conversation = data.conversations.find((item) => item.id === id && item.tenantId === tenantContext.tenantId);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const payload = parsed.data;

  switch (payload.action) {
    case "assign": {
      conversation.assignedTo = payload.assignedTo;
      break;
    }
    case "toggle_bot": {
      conversation.botEnabled = Boolean(payload.botEnabled);
      break;
    }
    case "close": {
      conversation.status = "closed";
      break;
    }
    case "reopen": {
      conversation.status = "open";
      break;
    }
    case "mark_hot": {
      conversation.priority = "hot";
      break;
    }
    case "unmark_hot": {
      conversation.priority = "normal";
      break;
    }
    case "mark_read": {
      data.messages
        .filter((item) => item.tenantId === tenantContext.tenantId && item.conversationId === conversation.id && item.direction === "inbound")
        .forEach((item) => {
          item.status = "read";
        });
      break;
    }
    case "mark_unread": {
      const latestInbound = data.messages
        .filter((item) => item.tenantId === tenantContext.tenantId && item.conversationId === conversation.id && item.direction === "inbound")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (latestInbound) latestInbound.status = "delivered";
      break;
    }
    case "add_note": {
      if (!payload.text) return NextResponse.json({ error: "Missing note text" }, { status: 400 });
      data.tenantNotes.unshift({
        id: newId("note"),
        tenantId: tenantContext.tenantId,
        authorId: tenantContext.ctx?.userId || "",
        conversationId: conversation.id,
        contactId: conversation.contactId,
        text: payload.text,
        createdAt: new Date().toISOString()
      });
      break;
    }
    case "add_task": {
      if (!payload.title) return NextResponse.json({ error: "Missing task title" }, { status: 400 });
      data.tenantTasks.unshift({
        id: newId("task"),
        tenantId: tenantContext.tenantId,
        conversationId: conversation.id,
        contactId: conversation.contactId,
        title: payload.title,
        dueDate: payload.dueDate,
        status: "todo",
        assignedTo: conversation.assignedTo,
        createdAt: new Date().toISOString()
      });
      break;
    }
    case "change_stage": {
      if (!payload.stage) return NextResponse.json({ error: "Missing stage" }, { status: 400 });
      const deal = data.deals.find((item) => item.tenantId === tenantContext.tenantId && item.contactId === conversation.contactId);
      if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      deal.stage = payload.stage;
      break;
    }
    default:
      break;
  }

  conversation.lastMessageAt = new Date().toISOString();
  writeSaasData(data);

  appendAuditLog({
    tenantId: tenantContext.tenantId,
    userId: tenantContext.ctx?.userId,
    action: `inbox_${payload.action}`,
    entity: "conversation",
    entityId: conversation.id
  });
  touchTenantActivity(tenantContext.tenantId);

  return NextResponse.json({ ok: true });
}
