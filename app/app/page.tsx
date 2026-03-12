import { ClientOnboardingChecklist } from "@/components/app/client-onboarding-checklist";
import { AppDashboard } from "@/components/app/app-dashboard";
import { canManageWorkspace } from "@/lib/app-permissions";
import { getPortalContacts, getPortalConversations, getPortalTenantContext, isBackendConfigured } from "@/lib/api";
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
  const businessSettings = useLocalDemoData && Array.isArray(localData?.businessSettings)
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
  let botResponses = useLocalDemoData ? (localData?.messages || []).filter((item) => item.tenantId === tenantId && item.direction === "system").length : 0;
  let humanResponses = useLocalDemoData ? (localData?.messages || []).filter((item) => item.tenantId === tenantId && item.direction === "outbound").length : 0;

  if (ctx.tenantId && isBackendReady) {
    try {
      const [contextResult, conversationsResult, contactsResult] = await Promise.all([
        getPortalTenantContext(ctx.tenantId),
        getPortalConversations(ctx.tenantId),
        getPortalContacts(ctx.tenantId)
      ]);

      whatsapp = buildWhatsAppConnectionStatus({ context: contextResult.data });
      tenantName = contextResult.data.clinic?.name || tenantName;
      tenantIndustry = "Workspace conectado";
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
    } catch {
      whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "portal_tenant_context_failed" });
      conversations = [];
      contacts = [];
    }
  }

  const hasWhatsAppChannel = hasOperationalWhatsAppChannel(whatsapp);
  const outboundMessages = humanResponses + botResponses;
  const avgResponseMinutes = conversations.length > 0 ? Math.round(conversations.reduce((acc, item) => acc + item.slaMinutes, 0) / conversations.length) : 0;
  const latestConversation = conversations[0];
  const latestDetail = useLocalDemoData && latestConversation ? getInboxConversationDetail(tenantId, latestConversation.id) : null;
  const hasBusinessProfile =
    Boolean(businessSettings?.openingHours?.trim()) ||
    Boolean(businessSettings?.address?.trim()) ||
    Boolean(businessSettings?.deliveryZones?.trim()) ||
    Boolean(businessSettings?.paymentMethods?.trim()) ||
    Boolean(businessSettings?.policies?.trim());
  const hasTriedInbox = conversations.length > 0;
  const onboardingSteps = [
    {
      id: "whatsapp",
      title: "Conectar WhatsApp",
      description: "Activa tu canal principal para recibir y responder mensajes desde Opturon.",
      href: "/app/integrations",
      ctaLabel:
        whatsapp.state === "connected"
          ? "Abrir inbox"
          : whatsapp.state === "ambiguous_configuration"
            ? "Revisar conexion"
            : "Conectar WhatsApp",
      status: hasWhatsAppChannel ? ("complete" as const) : ("pending" as const)
    },
    ...(canManage
      ? [
          {
            id: "business",
            title: "Completar perfil del negocio",
            description: "Carga datos basicos para que el portal y el equipo trabajen con mejor contexto.",
            href: "/app/business",
            ctaLabel: hasBusinessProfile ? "Editar perfil" : "Completar perfil",
            status: hasBusinessProfile ? ("complete" as const) : ("pending" as const)
          }
        ]
      : []),
    {
      id: "inbox",
      title: "Probar conversaciones",
      description: "Abre el inbox y verifica que las conversaciones reales ya entren correctamente.",
      href: "/app/inbox",
      ctaLabel: hasTriedInbox ? "Abrir inbox" : "Probar inbox",
      status: hasTriedInbox ? ("complete" as const) : ("pending" as const)
    },
    ...(canManage
      ? [
          {
            id: "automations",
            title: "Configurar automatizaciones",
            description: "Deja listas las respuestas y reglas basicas para empezar a automatizar tu atencion.",
            href: "/app/automations",
            ctaLabel: "Configurar",
            status: "pending" as const
          }
        ]
      : [])
  ];
  const completedCount = onboardingSteps.filter((step) => step.status === "complete").length;
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
      <ClientOnboardingChecklist steps={onboardingSteps} completedCount={completedCount} />
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
            helper: "Mensajes automatizados visibles para este workspace.",
            icon: "bot"
          },
          {
            label: "Tiempo medio de respuesta",
            value: `${avgResponseMinutes} min`,
            helper: "Promedio calculado sobre las conversaciones visibles del workspace.",
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
            detail: "El inbox ya soporta sugerencias, quick replies y acciones sobre conversaciones.",
            timeLabel: "Ahora",
            tone: "success"
          },
          {
            id: "activity-channel",
            title: hasWhatsAppChannel ? "Canal WhatsApp operativo" : "WhatsApp pendiente de activacion",
            detail: hasWhatsAppChannel
              ? "La cuenta ya puede usar inbox y automatizaciones sobre el canal conectado."
              : whatsapp.state === "ambiguous_configuration"
                ? "Detectamos una configuracion pendiente antes de activar el canal del workspace."
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
