import { ClientOnboardingChecklist } from "@/components/app/client-onboarding-checklist";
import { AppDashboard } from "@/components/app/app-dashboard";
import { canManageWorkspace } from "@/lib/app-permissions";
import { getPortalConversations, getPortalTenantContext, isBackendConfigured } from "@/lib/api";
import { requireAppPage } from "@/lib/saas/access";
import { getInboxConversationDetail, listInboxConversations, readSaasData } from "@/lib/saas/store";
import { buildWhatsAppConnectionStatus, hasOperationalWhatsAppChannel } from "@/lib/whatsapp-channel-state";

export default async function ClientPortalHome({ searchParams }: { searchParams: Promise<{ demo?: string; tenantId?: string }> }) {
  const ctx = await requireAppPage();
  const canManage = canManageWorkspace(ctx);
  const sp = await searchParams;
  const isDemo = sp.demo === "1";

  const data = readSaasData();
  const tenantId = ctx.tenantId || sp.tenantId || data.tenants[0]?.id || "";
  const tenant = data.tenants.find((item) => item.id === tenantId);
  const contacts = data.contacts.filter((item) => item.tenantId === tenantId);
  const businessSettings = Array.isArray(data.businessSettings)
    ? data.businessSettings.find((item) => item?.tenantId === tenantId) || null
    : null;
  const isBackendReady = Boolean(ctx.tenantId) && isBackendConfigured();
  let whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "workspace_without_backend" });
  let conversations = listInboxConversations(tenantId);

  if (ctx.tenantId && isBackendReady) {
    try {
      const [contextResult, conversationsResult] = await Promise.all([
        getPortalTenantContext(ctx.tenantId),
        getPortalConversations(ctx.tenantId)
      ]);

      whatsapp = buildWhatsAppConnectionStatus({ context: contextResult.data });
      const portalConversations = Array.isArray(conversationsResult.data?.conversations)
        ? conversationsResult.data.conversations
        : [];

      if (portalConversations.length > 0) {
        conversations = portalConversations;
      }
    } catch {
      whatsapp = buildWhatsAppConnectionStatus({ fallbackReason: "portal_tenant_context_failed" });
    }
  }

  const hasWhatsAppChannel = hasOperationalWhatsAppChannel(whatsapp);
  const messages = data.messages.filter((item) => item.tenantId === tenantId);
  const outboundMessages = messages.filter((item) => item.direction !== "inbound");
  const avgResponseMinutes = conversations.length > 0 ? Math.round(conversations.reduce((acc, item) => acc + item.slaMinutes, 0) / conversations.length) : 0;
  const latestConversation = conversations[0];
  const latestDetail = latestConversation ? getInboxConversationDetail(tenantId, latestConversation.id) : null;
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

  return (
    <div className="space-y-8">
      <ClientOnboardingChecklist steps={onboardingSteps} completedCount={completedCount} />
      <AppDashboard
        tenantName={tenant?.name || "Tu empresa"}
        tenantIndustry={tenant?.industry || "Negocio digital"}
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
            value: String(outboundMessages.length),
            helper: "Mensajes salientes o eventos del bot detectados en el dataset actual.",
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
            detail: latestDetail?.messages?.at(-1)?.text || "La actividad del inbox aparecera aqui.",
            timeLabel: latestDetail?.conversation?.lastMessageAt ? relativeLabel(latestDetail.conversation.lastMessageAt) : "Sin actividad",
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
        contacts={contacts.slice(0, 5).map((contact) => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone || "-",
          tags: contact.tags.length > 0 ? contact.tags : ["prospecto"],
          lastInteraction: latestConversation ? relativeLabel(latestConversation.lastMessageAt) : "Sin actividad"
        }))}
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
