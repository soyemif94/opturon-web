import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { appendAuditLog, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";

const patchSchema = z.object({
  nextActionAt: z.string().datetime().nullable().optional(),
  nextActionNote: z.string().nullable().optional()
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
      const response = await fetch(`${process.env.BACKEND_BASE_URL || process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://opturon-api.onrender.com"}/portal/tenants/${tenantContext.tenantId}/conversations/${id}/next-action`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-portal-key": String(process.env.PORTAL_INTERNAL_KEY || "")
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

  if (Object.prototype.hasOwnProperty.call(parsed.data, "nextActionAt")) {
    conversation.nextActionAt = parsed.data.nextActionAt || null;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, "nextActionNote")) {
    const safeNote = parsed.data.nextActionNote ? parsed.data.nextActionNote.trim() : "";
    conversation.nextActionNote = safeNote || null;
  }
  conversation.lastMessageAt = new Date().toISOString();
  writeSaasData(data);

  appendAuditLog({
    tenantId: tenantContext.tenantId,
    userId: tenantContext.ctx?.userId,
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
