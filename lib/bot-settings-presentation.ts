export type BotProvisioningStatus = "not_required" | "pending" | "ready" | "blocked" | "failed" | string | null | undefined;

export function provisioningPresentation(status: BotProvisioningStatus) {
  switch (status) {
    case "pending":
      return { label: "En proceso", detail: "Estamos completando la configuración inicial. Puede demorar entre 24 y 48 horas." };
    case "blocked":
      return { label: "Pendiente", detail: "La configuración necesita una revisión antes de poder utilizar el asistente." };
    case "failed":
      return { label: "Requiere atención", detail: "No pudimos completar la configuración. Contactá a soporte." };
    case "ready":
    case "not_required":
      return { label: "Lista", detail: "Tu asistente está listo para usar." };
    default:
      return { label: "Pendiente", detail: "La configuración inicial está pendiente." };
  }
}

export function formatBillingPeriod(periodStart?: string | null, periodEnd?: string | null) {
  if (!periodStart || !periodEnd) return "Período vigente";
  const format = (value: string) => new Intl.DateTimeFormat("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC"
  }).format(new Date(value));
  return `${format(periodStart)} — ${format(periodEnd)}`;
}

export function effectiveBotPresentation({
  provisioningStatus,
  botActive,
  quotaAvailable,
  channelOperational,
  entitled
}: {
  provisioningStatus: BotProvisioningStatus;
  botActive: boolean;
  quotaAvailable: boolean;
  channelOperational: boolean;
  entitled: boolean;
}) {
  if (!entitled) return { label: "No incluido en tu plan", detail: "El asistente inteligente está disponible desde Growth." };
  if (provisioningStatus === "pending") return { label: "Configuración en proceso", detail: "Tu asistente estará disponible cuando finalice la configuración inicial." };
  if (provisioningStatus === "blocked") return { label: "Configuración pendiente", detail: "La configuración necesita una revisión antes de poder utilizar el asistente." };
  if (provisioningStatus === "failed") return { label: "Requiere atención", detail: "No pudimos completar la configuración. Contactá a soporte." };
  if (!channelOperational) return { label: "Canal no disponible", detail: "Conectá un canal compatible para utilizar atención automática." };
  if (!quotaAvailable) return { label: "Pausado por límite de respuestas", detail: "Alcanzaste el límite de respuestas inteligentes del período." };
  return botActive
    ? { label: "Asistente activo", detail: "El asistente está activo." }
    : { label: "Asistente desactivado", detail: "El asistente está listo, pero la atención automática está desactivada." };
}
