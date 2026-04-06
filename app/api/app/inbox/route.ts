import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getBackendErrorStatus,
  getPortalConversations,
  getPortalTenantContext,
  getPortalWhatsAppEmbeddedSignupStatus,
  isBackendConfigured
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { listInboxConversations } from "@/lib/saas/store";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

const filtersSchema = z.object({
  filter: z.enum(["all", "new", "in_conversation", "follow_up", "closed", "unassigned", "nuevas", "asignadas"]).optional(),
  q: z.string().optional(),
  visibility: z.enum(["active", "archived"]).optional(),
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
  const visibility = params.visibility || "active";

  let conversations = tenantContext.readOnly ? listInboxConversations(tenantContext.tenantId) : [];
  let channelState = buildWhatsAppConnectionStatus({
    fallbackReason: tenantContext.readOnly ? "demo_workspace" : "workspace_without_backend"
  });

  if (!tenantContext.readOnly && isBackendConfigured()) {
    try {
      const [contextResult, conversationsResult, onboardingResult] = await Promise.all([
        getPortalTenantContext(tenantContext.tenantId),
        getPortalConversations(tenantContext.tenantId, { visibility }),
        getPortalWhatsAppEmbeddedSignupStatus(tenantContext.tenantId).catch(() => null)
      ]);

      channelState = buildWhatsAppConnectionStatus({ context: contextResult.data, onboarding: onboardingResult?.data || null });
      conversations = conversationsResult.data.conversations || [];
    } catch (error) {
      const reason = error instanceof Error ? error.message : "backend_fetch_failed";

      if (reason === "mapped_clinic_without_whatsapp_channel" || reason === "multiple_whatsapp_channels_configured") {
        channelState = buildWhatsAppConnectionStatus({ fallbackReason: reason });
        conversations = [];
      } else {
        return NextResponse.json(
          {
            error: reason
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
  }

  conversations = conversations.map((item) => ({
    ...item,
    leadStatus: item.leadStatus || "NEW"
  }));

  if (q) {
    conversations = conversations.filter((item) => {
      const text = `${item.contact?.name || ""} ${item.contact?.phone || ""} ${item.contact?.email || ""}`.toLowerCase();
      return text.includes(q);
    });
  }

  conversations = conversations.filter((item) => {
    if (filter === "new" || filter === "nuevas") return item.leadStatus === "NEW";
    if (filter === "in_conversation") return item.leadStatus === "IN_CONVERSATION";
    if (filter === "follow_up") return item.leadStatus === "FOLLOW_UP";
    if (filter === "closed") return item.leadStatus === "CLOSED";
    if (filter === "unassigned") return !item.assignedSellerUserId;
    if (filter === "asignadas") return Boolean(item.assignedSellerUserId && item.assignedSellerUserId === userId);
    return true;
  });

  return NextResponse.json(
    {
      readOnly: tenantContext.readOnly,
      tenantId: tenantContext.tenantId,
      channelState,
      conversations
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
