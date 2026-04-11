export type ProductExpirationState = "normal" | "expiring_soon" | "critical" | "expired";

const EXPIRING_SOON_DAYS = 10;
const CRITICAL_DAYS = 3;

function parseDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : /^\d{4}-\d{2}-\d{2}T/.test(value)
      ? value.slice(0, 10)
      : null;
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function differenceInDays(target: Date, now: Date) {
  const ms = target.getTime() - startOfToday(now).getTime();
  return Math.floor(ms / 86400000);
}

export function getProductExpirationStatus(expirationDate: string | null | undefined, now = new Date()) {
  const parsed = parseDateOnly(expirationDate);
  if (!parsed) return null;

  const daysUntilExpiration = differenceInDays(parsed, now);

  if (daysUntilExpiration < 0) {
    return {
      state: "expired" as ProductExpirationState,
      daysUntilExpiration
    };
  }

  if (daysUntilExpiration <= CRITICAL_DAYS) {
    return {
      state: "critical" as ProductExpirationState,
      daysUntilExpiration
    };
  }

  if (daysUntilExpiration <= EXPIRING_SOON_DAYS) {
    return {
      state: "expiring_soon" as ProductExpirationState,
      daysUntilExpiration
    };
  }

  return {
    state: "normal" as ProductExpirationState,
    daysUntilExpiration
  };
}

export function formatExpirationDate(expirationDate: string | null | undefined) {
  const parsed = parseDateOnly(expirationDate);
  if (!parsed) return "Sin vencimiento";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(parsed);
}

export function getExpirationBadgePresentation(expirationDate: string | null | undefined, now = new Date()) {
  const status = getProductExpirationStatus(expirationDate, now);
  if (!status) {
    return {
      variant: "outline" as const,
      label: "Sin vencimiento",
      helper: "No requiere control de vencimiento cargado."
    };
  }

  if (status.state === "expired") {
    return {
      variant: "danger" as const,
      label: "Vencido",
      helper: "La fecha de vencimiento ya pasó."
    };
  }

  if (status.state === "critical") {
    return {
      variant: "danger" as const,
      label: "Crítico",
      helper: status.daysUntilExpiration === 0 ? "Vence hoy." : `Vence en ${status.daysUntilExpiration} día${status.daysUntilExpiration === 1 ? "" : "s"}.`
    };
  }

  if (status.state === "expiring_soon") {
    return {
      variant: "warning" as const,
      label: "Próximo a vencer",
      helper: `Vence en ${status.daysUntilExpiration} día${status.daysUntilExpiration === 1 ? "" : "s"}.`
    };
  }

  return {
    variant: "success" as const,
    label: "Normal",
    helper: `Vence en ${status.daysUntilExpiration} día${status.daysUntilExpiration === 1 ? "" : "s"}.`
  };
}

export const PRODUCT_EXPIRATION_RULES = {
  expiringSoonDays: EXPIRING_SOON_DAYS,
  criticalDays: CRITICAL_DAYS
};
