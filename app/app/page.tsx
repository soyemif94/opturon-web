import { ClientOnboardingChecklist } from "@/components/app/client-onboarding-checklist";
import { AppDashboard } from "@/components/app/app-dashboard";
import { canManageWorkspace } from "@/lib/app-permissions";
import {
  getPortalBusinessSettings,
  getPortalContacts,
  getPortalConversations,
  getPortalTenantContext,
  getPortalWhatsAppEmbeddedSignupStatus,
  isBackendConfigured,
  type PortalBusinessSettings
} from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { getInboxConversationDetail, listInboxConversations, readSaasData } from "@/lib/saas/store";
import { buildWhatsAppConnectionStatus, hasOperationalWhatsAppChannel } from "@/lib/whatsapp-channel-state";

export default async function ClientPortalHome({ searchParams }: { searchParams: Promise<{ demo?: string; tenantId?: string }> }) {
  const ctx = await requireAppPage();
  const canManage = canManageWorkspace(ctx);
  const sp = await searchParams;
  const isDemo = sp.demo === "1";
  const useLocalDemoData = !ctx.tenantId;

  const localData = useLocalDemoData ? readSaasData() : null;
  const tenantId = ctx.tenantId || sp.tenantId || localData?.tenants[0]?.id || "";
  const tenant = useLocalDemoData ? localData?.tenants.find((item) => item.id === tenantId) || null : null;
  let businessSettings: PortalBusinessSettings | {
    tenantId?: string;
    openingHours?: string;
    address?: string;
    deliveryZones?: string;
    paymentMethods?: string;
    policies?: string;
  } | null = useLocalDemoData && Array.isArray(localData?.businessSettings)
    ? localData.businessSettings.find((item) => item?.tenantId === tenantId) || null
    : null;
  const isBackendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "workspace_without_backend" });
  let conversations = useLocalDemoData ? listInboxConversations(tenantId) : [];
  let contacts: Array<{ id: string; name: string; phone?: string | null; tags?: string[]; lastInteractionAt?: string | null }> = useLocalDemoData
    ? (localData?.contacts || [])
        .filter((item) => item.tenantId === tenantId)
        .map((item) => ({
          id: item.id,
          name: item.name,
          phone: item.phone || null,
          tags: item.tags || [],
          lastInteractionAt: null
        }))
    : [];
  let tenantName = tenant?.name || "Tu empresa";
  let tenantIndustry = tenant?.industry || "Negocio digital";
  let onboardingState = {
    hasChannel: false,
    hasProducts: false,
    hasMessages: false,
    botEnabled: false
  };
  let botResponses = useLocalDemoData ? (localData?.messages || []).filter((item) => item.tenantId === tenantId && item.direction === "system").length : 0;
  let humanResponses = useLocalDemoData ? (localData?.messages || []).filter((item) => item.tenantId === tenantId && item.direction === "outbound").length : 0;

  if (ctx.tenantId && isBackendReady) {
    try {
      const [contextResult, conversationsResult, contactsResult, onboardingResult, businessResult] = await Promise.all([
        getPortalTenantContext(ctx.tenantId),
        getPortalConversations(ctx.tenantId),
        getPortalContacts(ctx.tenantId),
        getPortalWhatsAppEmbeddedSignupStatus(ctx.tenantId).catch(() => null),
        getPortalBusinessSettings(ctx.tenantId).catch(() => null)
      ]);
      whatsapp = buildWhatsAppConnectionStatus({ context: contextResult.data, onboarding: onboardingResult?.data || null });
      tenantName = contextResult.data.clinic?.name || tenantName;
      tenantIndustry = "Espacio conectado";
      const portalConversations = Array.isArray(conversationsResult.data?.conversations)
        ? conversationsResult.data.conversations
        : [];
      const portalContacts = Array.isArray(contactsResult.data?.contacts) ? contactsResult.data.contacts : [];

      conversations = portalConversations;
      contacts = portalContacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone || "",
        tags: contact.optedOut ? ["sin contacto"] : ["prospecto"],
        lastInteractionAt: contact.lastInteractionAt
      }));
      businessSettings = businessResult?.data?.settings || businessSettings;
      onboardingState = contextResult.data.onboarding || onboardingState;
    } catch {
      whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "portal_tenant_context_failed" });
      conversations = [];
      contacts = [];
    }
  }

  if (useLocalDemoData) {
    onboardingState = {
      hasChannel: true,
      hasProducts: false,
      hasMessages: conversations.length > 0,
      botEnabled: true
    };
  }

  const hasWhatsAppChannel = hasOperationalWhatsAppChannel(whatsapp);
  const outboundMessages = humanResponses + botResponses;
  const avgResponseMinutes = conversations.length > 0 ? Math.round(conversations.reduce((acc, item) => acc + item.slaMinutes, 0) / conversations.length) : 0;
  const latestConversation = conversations[0];
  const latestDetail = useLocalDemoData && latestConversation ? getInboxConversationDetail(tenantId, latestConversation.id) : null;
  const onboardingSteps = [
    {
      id: "whatsapp",
      label: "Conectar WhatsApp",
      href: "/app/integrations",
      ctaLabel: onboardingState.hasChannel ? "Ver canal" : "Conectar",
      status: onboardingState.hasChannel ? ("done" as const) : ("pending" as const)
    },
    {
      id: "products",
      label: "Cargar productos",
      href: "/app/catalog",
      ctaLabel: onboardingState.hasProducts ? "Ver catálogo" : "Cargar productos",
      status: onboardingState.hasProducts ? ("done" as const) : ("pending" as const)
    },
    {
      id: "bot",
      label: "Probar el bot",
      href: "/app/inbox",
      ctaLabel: onboardingState.hasMessages ? "Abrir inbox" : "Probar ahora",
      status: onboardingState.hasMessages ? ("done" as const) : ("pending" as const)
    },
    {
      id: "automation",
      label: "Activar atención automática",
      href: "/app/automations",
      ctaLabel: onboardingState.botEnabled ? "Ver automatizaciones" : "Activar",
      status: onboardingState.botEnabled ? ("done" as const) : ("pending" as const)
    }
  ];
  const dashboardContacts = contacts.slice(0, 5).map((contact) => ({
    id: contact.id,
    name: contact.name,
    phone: contact.phone || "-",
    tags: "tags" in contact && Array.isArray(contact.tags) && contact.tags.length > 0 ? contact.tags : ["prospecto"],
    lastInteraction:
      "lastInteractionAt" in contact && contact.lastInteractionAt
        ? relativeLabel(String(contact.lastInteractionAt))
        : latestConversation
          ? relativeLabel(latestConversation.lastMessageAt)
          : "Sin actividad"
  }));

  return (
    <div className="space-y-8">
      <ClientOnboardingChecklist steps={onboardingSteps} />
      <AppDashboard
        tenantName={tenantName}
        tenantIndustry={tenantIndustry}
        demoMode={isDemo}
        hasWhatsAppChannel={hasWhatsAppChannel}
        channelStatus={
          hasWhatsAppChannel
            ? {
                label: "Canal conectado",
                detail: whatsapp.description,
                tone: "success"
              }
            : whatsapp.state === "ambiguous_configuration"
              ? {
                  label: "Conexion en revision",
                  detail: whatsapp.description,
                  tone: "danger"
                }
              : {
                  label: "WhatsApp pendiente",
                  detail: whatsapp.description,
                  tone: "warning"
                }
        }
        stats={[
          {
            label: "Conversaciones hoy",
            value: String(conversations.length),
            helper: "Conversaciones visibles para seguimiento comercial y operativo.",
            icon: "conversations"
          },
          {
            label: "Contactos nuevos",
            value: String(contacts.length),
            helper: "Base inicial de contactos dentro del portal cliente.",
            icon: "contacts"
          },
          {
            label: "Mensajes automatizados",
            value: String(botResponses),
            helper: "Mensajes automatizados visibles para este espacio.",
            icon: "bot"
          },
          {
            label: "Tiempo medio de respuesta",
            value: `${avgResponseMinutes} min`,
            helper: "Promedio calculado sobre las conversaciones visibles del espacio.",
            icon: "response"
          }
        ]}
        recentActivity={[
          {
            id: "activity-conversation",
            title: latestDetail?.contact?.name ? `Nueva actividad con ${latestDetail.contact.name}` : "Conversacion reciente",
            detail: latestDetail?.messages?.at(-1)?.text || latestConversation?.lastMessagePreview || "La actividad del inbox aparecera aqui.",
            timeLabel: latestDetail?.conversation?.lastMessageAt
              ? relativeLabel(latestDetail.conversation.lastMessageAt)
              : latestConversation?.lastMessageAt
                ? relativeLabel(latestConversation.lastMessageAt)
                : "Sin actividad",
            tone: "neutral"
          },
          {
            id: "activity-bot",
            title: "Portal listo para atender mensajes",
            detail: "La bandeja ya soporta sugerencias, respuestas rapidas y acciones sobre conversaciones.",
            timeLabel: "Ahora",
            tone: "success"
          },
          {
            id: "activity-channel",
            title: hasWhatsAppChannel ? "Canal WhatsApp operativo" : "WhatsApp pendiente de activacion",
            detail: hasWhatsAppChannel
              ? "La cuenta ya puede usar inbox y automatizaciones sobre el canal conectado."
              : whatsapp.state === "ambiguous_configuration"
                ? "Detectamos una configuracion pendiente antes de activar el canal del espacio."
                : "Conectar WhatsApp habilitara conversaciones reales y la activacion del canal desde el portal.",
            timeLabel: "Hoy",
            tone: hasWhatsAppChannel ? "success" : "warning"
          }
        ]}
        contacts={dashboardContacts}
        quickLinks={[
          { label: "Abrir inbox", href: "/app/inbox", helper: "Ir a la vista completa de conversaciones y chat." },
          { label: "Gestionar contactos", href: "/app/contacts", helper: "Ver CRM simple con tags y ultima interaccion." },
          { label: "Ver metricas", href: "/app/metrics", helper: "Revisar conversaciones, prospectos y respuesta del bot." },
          ...(canManage
            ? [
                {
                  label: whatsapp.state === "ambiguous_configuration" ? "Revisar conexion" : "Conectar WhatsApp",
                  href: "/app/integrations",
                  helper: "Activar el canal principal del negocio."
                }
              ]
            : [])
        ]}
      />
    </div>
  );
}

function relativeLabel(dateString: string) {
  const value = new Date(dateString).getTime();
  if (Number.isNaN(value)) return "Sin fecha";
  const diffMs = Date.now() - value;
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}
