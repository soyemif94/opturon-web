import type { PortalTenantContext } from "@/lib/api";
import type { PortalWhatsAppEmbeddedSignupStatus } from "@/lib/api";

export type WhatsAppConnectionState =
  | "idle"
  | "launching"
  | "pending_meta"
  | "connected"
  | "not_connected"
  | "ambiguous_configuration"
  | "error";

export type WhatsAppConnectionStatus = {
  state: WhatsAppConnectionState;
  reason: string;
  tenantId: string | null;
  clinicId: string | null;
  channelId: string | null;
  connectedNumber: string | null;
  channelStatus: string | null;
  webhookActive: boolean | null;
  title: string;
  description: string;
  helper: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

type BuildOptions = {
  context?: PortalTenantContext | null;
  onboarding?: PortalWhatsAppEmbeddedSignupStatus | null;
  fallbackReason?: string | null;
};

function normalizeStatus(rawStatus?: string | null) {
  const value = String(rawStatus || "").trim().toLowerCase();
  return value || null;
}

export function buildWhatsAppConnectionStatus({
  context,
  onboarding,
  fallbackReason
}: BuildOptions = {}): WhatsAppConnectionStatus {
  const reason = String(context?.reason || fallbackReason || "portal_channel_status_unknown").trim();
  const channelStatus = normalizeStatus(context?.channel?.status);
  const onboardingState = String(onboarding?.onboardingState || "").trim().toLowerCase();
  const onboardingSession = onboarding?.session || null;
  const base = {
    reason: onboardingSession?.errorCode || reason,
    tenantId: context?.tenantId || null,
    clinicId: context?.clinic?.id || null,
    channelId: context?.channel?.id || null,
    connectedNumber: context?.channel?.displayPhoneNumber || context?.channel?.phoneNumberId || onboardingSession?.displayPhoneNumber || onboardingSession?.phoneNumberId || null,
    channelStatus,
    webhookActive: channelStatus === "active"
  };

  if (context?.channel && channelStatus === "active") {
    return {
      ...base,
      state: "connected",
      title: "Tu WhatsApp Business ya esta conectado",
      description: "Tu numero ya esta listo para recibir mensajes, abrir conversaciones reales y responder desde Opturon.",
      helper: "El inbox, el checklist y las automatizaciones ya pueden operar sobre este canal.",
      primaryCtaLabel: "Abrir inbox",
      secondaryCtaLabel: "Gestionar conexion"
    };
  }

  if (context?.channel && (channelStatus === "pending" || channelStatus === "connecting")) {
    return {
      ...base,
      state: "pending_meta",
      title: "Tu conexion con WhatsApp esta en curso",
      description: "Ya detectamos una conexion pendiente. Falta completar la activacion final para empezar a operar desde el inbox.",
      helper: "En cuanto Meta termine de validar el numero y el canal, el workspace quedara listo para usar.",
      primaryCtaLabel: "Continuar conexion",
      secondaryCtaLabel: "Necesito ayuda"
    };
  }

  if (onboardingState === "pending_meta" && !context?.channel) {
    return {
      ...base,
      state: "pending_meta",
      title: "Tu conexion con WhatsApp esta en curso",
      description: "Ya iniciamos el onboarding con Meta para este workspace. Falta completar o confirmar la activacion final del canal.",
      helper:
        onboardingSession?.errorMessage ||
        "Si cerraste la ventana de Meta antes de terminar, podes reintentar la conexion desde este mismo workspace.",
      primaryCtaLabel: "Continuar conexion",
      secondaryCtaLabel: "Ir a integraciones"
    };
  }

  if (reason === "multiple_whatsapp_channels_configured") {
    return {
      ...base,
      state: "ambiguous_configuration",
      title: "Necesitamos revisar la configuracion del canal",
      description: "Detectamos mas de un canal posible para este workspace y preferimos no mostrar un numero incorrecto.",
      helper: "Revisemos la conexion antes de activarla para que el inbox y las automatizaciones usen solo el canal correcto.",
      primaryCtaLabel: "Revisar conexion",
      secondaryCtaLabel: "Contactar soporte"
    };
  }

  if (reason === "mapped_clinic_without_whatsapp_channel" || !context?.channel) {
    return {
      ...base,
      state: "not_connected",
      title: "Todavia no conectaste tu WhatsApp",
      description: "Cuando conectes tu numero, aca vas a ver tus conversaciones y vas a poder responder desde Opturon.",
      helper: "La activacion se hace desde Integraciones y despues vas a poder usar inbox, automatizaciones y seguimiento comercial.",
      primaryCtaLabel: "Conectar WhatsApp",
      secondaryCtaLabel: "Ir a integraciones"
    };
  }

  return {
    ...base,
    state: "error",
    title: "No pudimos resolver el estado de tu canal",
    description: "Hay una falla real de configuracion o conectividad y conviene revisarla antes de operar con mensajes reales.",
    helper: "Si el problema persiste, revisa Integraciones o contacta a soporte para destrabar la conexion.",
    primaryCtaLabel: "Revisar conexion",
    secondaryCtaLabel: "Contactar soporte"
  };
}

export function hasOperationalWhatsAppChannel(status: WhatsAppConnectionStatus) {
  return status.state === "connected";
}

export function shouldShowInboxChannelEmptyState(status: WhatsAppConnectionStatus) {
  return status.state === "not_connected" || status.state === "ambiguous_configuration" || status.state === "pending_meta";
}
