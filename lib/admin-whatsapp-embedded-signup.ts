import type { PortalWhatsAppEmbeddedSignupStatus } from "@/lib/api";

export function buildAdminEmbeddedSignupViewModel(input: {
  embeddedSignupStatus: PortalWhatsAppEmbeddedSignupStatus | null;
  readinessReady: boolean;
  tenantId: string;
  connecting: boolean;
  onboardingLoading: boolean;
}) {
  const hasActiveConflict = Boolean(input.embeddedSignupStatus?.activeSession);
  const canConnect = Boolean(input.readinessReady && input.tenantId && !input.connecting && !hasActiveConflict);
  const canCancelCurrent = Boolean(input.embeddedSignupStatus?.canCancel && !input.connecting && !input.onboardingLoading);

  return {
    hasActiveConflict,
    canConnect,
    canCancelCurrent
  };
}

export function buildAdminEmbeddedSignupErrorMessage(details: { code?: string | null; message: string }) {
  if (String(details.code || "").trim() === "meta_embedded_signup_not_available_for_bsp_or_tp") {
    return "Meta rechazo la conexion porque Opturon todavia no esta habilitado como Tech Provider o BSP.";
  }
  return details.message;
}
