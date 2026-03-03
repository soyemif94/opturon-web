const OFFICIAL_WA_NUMBER = "5492915665793";
const OFFICIAL_WA_LINK = `https://wa.me/${OFFICIAL_WA_NUMBER}`;
const DEFAULT_PREFILL =
  "Hola Opturon. Quiero una auditoria estrategica inicial (15 min) para automatizar WhatsApp comercial e integrarlo con CRM. Como avanzamos?";
const DEFAULT_TRACKING_CAMPAIGN = "opturon_home";

const PREFILL_BY_ORIGIN: Record<string, string> = {
  hero:
    "Hola Opturon. Quiero una auditoria estrategica inicial (15 min) para automatizar WhatsApp comercial e integrarlo con CRM.\n\nRubro:\nEquipo comercial (cantidad):\nConsultas/mes aprox:\nCRM actual:\nObjetivo (ventas/soporte/ambos):\nDia habil preferido para contacto:",
  "cta-final":
    "Hola Opturon. Quiero ordenar WhatsApp comercial con automatizacion + CRM a traves de una auditoria estrategica inicial (15 min).\n\nRubro:\nConsultas/mes aprox:\nCRM actual:\nObjetivo:\nNecesidad de calificacion/conversion:",
  sticky:
    "Hola Opturon. Quiero conversar sobre una auditoria estrategica inicial (15 min) para automatizar WhatsApp comercial.\n\nRubro:\nConsultas/mes aprox:\nDia habil para contacto:",
  "package-starter":
    "Hola Opturon. Me interesa el paquete WhatsApp Starter y quiero una auditoria estrategica inicial (15 min).\n\nRubro:\nConsultas/mes:\nCRM:\nObjetivo principal:",
  "package-sales":
    "Hola Opturon. Me interesa el paquete Sales System y quiero una auditoria estrategica inicial (15 min).\n\nRubro:\nConsultas/mes:\nCRM:\nObjetivo principal:",
  "package-scale":
    "Hola Opturon. Me interesa el paquete Ops & Scale y quiero una auditoria estrategica inicial (15 min).\n\nRubro:\nConsultas/mes:\nCRM:\nObjetivo principal:",
  "audit-intake":
    "Hola Opturon. Quiero una auditoria estrategica inicial (15 min) para automatizar WhatsApp comercial e integrarlo con CRM.\n\nRubro:\nEquipo comercial:\nConsultas/mes:\nCRM actual:\nObjetivo:\nPaquete de interes:\n\nMe indican proximos pasos y disponibilidad?"
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeWaNumber(input?: string | null): string {
  const raw = String(input || "").trim();
  const digitsOnly = normalizeDigits(raw);
  const hasPlaceholderZeros = /0{7,}/.test(digitsOnly);
  const isKnownPlaceholder = digitsOnly.includes("5490000000000");

  if (
    digitsOnly.length < 10 ||
    digitsOnly.length > 15 ||
    /^0+$/.test(digitsOnly) ||
    hasPlaceholderZeros ||
    isKnownPlaceholder
  ) {
    return OFFICIAL_WA_NUMBER;
  }

  return digitsOnly;
}

export function getWhatsAppLink() {
  const number = normalizeWaNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);

  const rawPrefill = String(process.env.NEXT_PUBLIC_WHATSAPP_PREFILL || DEFAULT_PREFILL).trim();
  if (!rawPrefill) {
    return `https://wa.me/${number}`;
  }

  try {
    return `https://wa.me/${number}?text=${encodeURIComponent(rawPrefill)}`;
  } catch {
    return OFFICIAL_WA_LINK;
  }
}

export function isWhatsAppExternalLink(url: string) {
  return /^https:\/\/wa\.me\//.test(url);
}

type TrackedWhatsAppLinkParams = {
  origin:
    | "hero"
    | "cta-final"
    | "sticky"
    | "package-starter"
    | "package-sales"
    | "package-scale"
    | "audit-intake"
    | string;
  prefill?: string;
};

export function getTrackedWhatsAppLink({ origin, prefill }: TrackedWhatsAppLinkParams) {
  const number = normalizeWaNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);

  const fallbackPrefill = String(process.env.NEXT_PUBLIC_WHATSAPP_PREFILL || DEFAULT_PREFILL).trim();
  const basePrefill = prefill || PREFILL_BY_ORIGIN[origin] || fallbackPrefill;

  try {
    const params = new URLSearchParams({
      text: basePrefill,
      utm_source: "website",
      utm_medium: "cta",
      utm_campaign: DEFAULT_TRACKING_CAMPAIGN,
      utm_content: origin
    });

    return `https://wa.me/${number}?${params.toString()}`;
  } catch {
    return OFFICIAL_WA_LINK;
  }
}

// Manual quick-check:
// normalizeWaNumber(undefined)               -> 5492915665793
// normalizeWaNumber("")                     -> 5492915665793
// normalizeWaNumber("+54 9 291 566 5793")   -> 5492915665793
// normalizeWaNumber("000")                  -> 5492915665793
// normalizeWaNumber("5492915665793")        -> 5492915665793
