import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBackendErrorStatus, getPortalConversations, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { listInboxConversations } from "@/lib/saas/store";

const filtersSchema = z.object({
  filter: z.enum(["all", "hot", "sin_responder", "nuevas", "asignadas"]).optional(),
  q: z.string().optional(),
  tenantId: z.string().optional(),
  demo: z.string().optional()
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = filtersSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const params = parsed.data;
  const tenantContext = await resolveAppTenant({
    requestedTenantId: params.tenantId,
    demo: params.demo === "1"
  });
  if (tenantContext.error) return tenantContext.error;

  const userId = tenantContext.ctx?.userId;
  const q = (params.q || "").toLowerCase().trim();
  const filter = params.filter || "all";

  let conversations = listInboxConversations(tenantContext.tenantId);

  if (!tenantContext.readOnly && isBackendConfigured()) {
    try {
      conversations = (await getPortalConversations(tenantContext.tenantId)).data.conversations || [];
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "backend_fetch_failed"
        },
        {
          status: getBackendErrorStatus(error) || 502,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }
  }

  if (q) {
    conversations = conversations.filter((item) => {
      const text = `${item.contact?.name || ""} ${item.contact?.phone || ""} ${item.contact?.email || ""}`.toLowerCase();
      return text.includes(q);
    });
  }

  conversations = conversations.filter((item) => {
    if (filter === "hot") return item.priority === "hot";
    if (filter === "sin_responder") return item.unreadCount > 0;
    if (filter === "nuevas") return item.status === "new";
    if (filter === "asignadas") return Boolean(item.assignedTo && item.assignedTo === userId);
    return true;
  });

  return NextResponse.json({
    readOnly: tenantContext.readOnly,
    tenantId: tenantContext.tenantId,
    conversations
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
