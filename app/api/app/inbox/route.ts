import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getBackendErrorStatus,
  getPortalConversations,
  getPortalInstagramStatus,
  getPortalTenantContext,
  getPortalWhatsAppEmbeddedSignupStatus,
  isBackendConfigured
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";
import { applyCommercialBotHandoff, listInboxConversations } from "@/lib/saas/store";
import { buildWhatsAppConnectionStatus, hasOperationalWhatsAppChannel } from "@/lib/whatsapp-channel-state";

const filtersSchema = z.object({
  filter: z.enum(["all", "new", "in_conversation", "follow_up", "closed", "unassigned", "with_follow_up", "overdue", "today", "nuevas", "asignadas"]).optional(),
  q: z.string().optional(),
  visibility: z.enum(["active", "archived"]).optional(),
  channel: z.enum(["whatsapp", "instagram"]).optional(),
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
  const channel = params.channel || "whatsapp";

  if (tenantContext.readOnly) {
    applyCommercialBotHandoff(tenantContext.tenantId);
  }

  let conversations = tenantContext.readOnly ? listInboxConversations(tenantContext.tenantId) : [];
  let channelState = buildWhatsAppConnectionStatus({
    fallbackReason: tenantContext.readOnly ? "demo_workspace" : "workspace_without_backend"
  });
  let availableChannels = {
    whatsapp: tenantContext.readOnly,
    instagram: false
  };

  if (!tenantContext.readOnly && isBackendConfigured()) {
    try {
      const [contextAttempt, conversationsResult, onboardingResult, instagramResult] = await Promise.all([
        getPortalTenantContext(tenantContext.tenantId)
          .then((result) => ({ result, error: null }))
          .catch((error: unknown) => ({ result: null, error })),
        getPortalConversations(tenantContext.tenantId, { visibility, channel }),
        getPortalWhatsAppEmbeddedSignupStatus(tenantContext.tenantId).catch(() => null),
        getPortalInstagramStatus(tenantContext.tenantId).catch(() => null)
      ]);

      if (contextAttempt.error) {
        const reason = contextAttempt.error instanceof Error ? contextAttempt.error.message : "backend_fetch_failed";
        if (reason !== "mapped_clinic_without_whatsapp_channel" && reason !== "multiple_whatsapp_channels_configured") {
          throw contextAttempt.error;
        }
        channelState = buildWhatsAppConnectionStatus({ fallbackReason: reason, onboarding: onboardingResult?.data || null });
      } else {
        channelState = buildWhatsAppConnectionStatus({
          context: contextAttempt.result?.data,
          onboarding: onboardingResult?.data || null
        });
      }

      availableChannels = {
        whatsapp: hasOperationalWhatsAppChannel(channelState),
        instagram:
          instagramResult?.data?.state === "connected" &&
          Boolean(instagramResult.data.channel) &&
          String(instagramResult.data.channel?.status || "").trim().toLowerCase() === "active"
      };
      conversations = conversationsResult.data.conversations || [];
    } catch (error) {
      const reason = error instanceof Error ? error.message : "backend_fetch_failed";
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

  conversations = conversations.map((item) => {
    const conversation = item as typeof item & {
      channelType?: string | null;
      channelProvider?: string | null;
      channelLabel?: string | null;
    };
    return {
      ...conversation,
      channelType: conversation.channelType || "whatsapp",
      channelProvider: conversation.channelProvider || "whatsapp_cloud",
      channelLabel: conversation.channelLabel || "WhatsApp",
      leadStatus: conversation.leadStatus || "NEW"
    };
  });

  conversations = conversations.filter((item) => {
    const conversation = item as typeof item & { channelType?: string | null };
    const itemChannel = String(conversation.channelType || "whatsapp").toLowerCase();
    return itemChannel === channel;
  });

  if (q) {
    conversations = conversations.filter((item) => {
      const text = `${item.contact?.name || ""} ${item.contact?.phone || ""} ${item.contact?.email || ""}`.toLowerCase();
      return text.includes(q);
    });
  }

  conversations = conversations.filter((item) => {
    const nextActionAt = item.nextActionAt ? new Date(item.nextActionAt) : null;
    const hasNextAction = nextActionAt && !Number.isNaN(nextActionAt.getTime());
    const now = new Date();
    const isToday =
      hasNextAction &&
      nextActionAt.getFullYear() === now.getFullYear() &&
      nextActionAt.getMonth() === now.getMonth() &&
      nextActionAt.getDate() === now.getDate();
    if (filter === "new" || filter === "nuevas") return item.leadStatus === "NEW";
    if (filter === "in_conversation") return item.leadStatus === "IN_CONVERSATION";
    if (filter === "follow_up") return item.leadStatus === "FOLLOW_UP";
    if (filter === "closed") return item.leadStatus === "CLOSED";
    if (filter === "unassigned") return !item.assignedSellerUserId;
    if (filter === "with_follow_up") return Boolean(hasNextAction);
    if (filter === "overdue") return Boolean(hasNextAction && nextActionAt.getTime() < now.getTime());
    if (filter === "today") return Boolean(isToday);
    if (filter === "asignadas") return Boolean(item.assignedSellerUserId && item.assignedSellerUserId === userId);
    return true;
  });

  return NextResponse.json(
    {
      readOnly: tenantContext.readOnly,
      tenantId: tenantContext.tenantId,
      channelState,
      availableChannels,
      conversations
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
