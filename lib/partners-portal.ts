export type PartnerPortalPage = "home" | "clients" | "career" | "commissions" | "profile";

export type PartnerPortalPartner = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  profile?: {
    code?: string | null;
    displayName?: string | null;
    legalName?: string | null;
    phone?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown>;
  } | null;
  sponsorPartnerId?: string | null;
  activeAttributionCount?: number | null;
  currentRankCode?: string | null;
};

export type PartnerPortalSummary = {
  activeClients?: number | null;
  generatedCommissions?: string | null;
  latestRank?: string | null;
};

export type PartnerPortalClientBilling = {
  subscriptionStatus: string | null;
  paymentStatus: string | null;
  planName: string | null;
  lastAccreditedPaymentAt: string | null;
  nextPaymentAt: string | null;
};

export type PartnerPortalClientAttribution = {
  id: string;
  partnerId: string;
  clinicId: string;
  tenantId: string;
  status: string;
  attributionSource?: string | null;
  notes?: string | null;
  attributedAt?: string | null;
  endedAt?: string | null;
  clinicName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  billing?: PartnerPortalClientBilling | null;
};

export type PartnerPortalRankHistoryEntry = {
  id: string;
  partnerId: string;
  rankCode?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  evaluationId?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type PartnerPortalCareerRequirement = {
  code: string;
  label: string;
  currentValue: string | number | null;
  targetValue: string | number | null;
  remainingValue: string | number | null;
  completed: boolean;
  valueType?: "count" | "currency" | null;
  currency?: string | null;
};

export type PartnerPortalCareerProgress = {
  currentRank?: string | null;
  nextRank?: string | null;
  progressPercent?: number | null;
  requirements?: PartnerPortalCareerRequirement[];
  evaluationStatus?: string | null;
  evaluatedAt?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  latestEvaluation?: Record<string, unknown> | null;
  rankHistory?: PartnerPortalRankHistoryEntry[];
};

export const PARTNER_PORTAL_PREVIEW_HEADER = "x-opturon-partner-preview";

export const PARTNER_PORTAL_NAV = [
  { href: "/partners", label: "Inicio", page: "home" as const },
  { href: "/partners/clients", label: "Mis clientes", page: "clients" as const },
  { href: "/partners/career", label: "Mi carrera", page: "career" as const },
  { href: "/partners/commissions", label: "Comisiones", page: "commissions" as const },
  { href: "/partners/profile", label: "Perfil", page: "profile" as const }
];

export const PARTNER_CAREER_LADDER = [
  {
    code: "asesor",
    label: "Asesor",
    rules: ["25% por alta propia", "10% recurrente propio"]
  },
  {
    code: "lider",
    label: "Lider",
    rules: ["27,5% por alta propia", "11% recurrente propio", "2% primera linea"]
  },
  {
    code: "coordinador",
    label: "Coordinador",
    rules: ["30% por alta propia", "12% recurrente propio", "3% primera linea", "1,5% segunda linea"]
  },
  {
    code: "emperador",
    label: "Emperador",
    rules: ["32,5% por alta propia", "12% recurrente propio", "4% primera linea", "2% segunda linea", "1% tercera linea"]
  }
];

export function formatPartnerStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "Activa";
  if (normalized === "inactive") return "Inactiva";
  if (normalized === "disabled") return "Inhabilitada";
  if (normalized === "suspended") return "Suspendida";
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Sin estado";
}

export function partnerStatusVariant(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "success" as const;
  if (normalized === "suspended" || normalized === "disabled") return "danger" as const;
  if (normalized === "inactive") return "warning" as const;
  return "muted" as const;
}

export function formatRankLabel(rank?: string | null) {
  const normalized = String(rank || "").trim().toLowerCase();
  if (!normalized) return "Sin rango asignado";
  const found = PARTNER_CAREER_LADDER.find((item) => item.code === normalized);
  if (found) return found.label;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function resolveCurrentRank(
  summary?: PartnerPortalSummary | null,
  partner?: PartnerPortalPartner | null,
  rankHistory?: PartnerPortalRankHistoryEntry[]
) {
  return rankHistory?.[0]?.rankCode || summary?.latestRank || partner?.currentRankCode || null;
}

export function resolveNextRankLabel(rank?: string | null) {
  const currentIndex = PARTNER_CAREER_LADDER.findIndex((item) => item.code === String(rank || "").trim().toLowerCase());
  if (currentIndex < 0) return PARTNER_CAREER_LADDER[0]?.label || "Asesor";
  return PARTNER_CAREER_LADDER[currentIndex + 1]?.label || "Rango maximo alcanzado";
}

export function resolveCareerStepProgress(rank?: string | null) {
  const currentIndex = PARTNER_CAREER_LADDER.findIndex((item) => item.code === String(rank || "").trim().toLowerCase());
  if (currentIndex < 0) return 10;
  return Math.round(((currentIndex + 1) / PARTNER_CAREER_LADDER.length) * 100);
}

export function clampCareerProgress(value?: number | null) {
  const safe = Number(value);
  if (!Number.isFinite(safe)) return null;
  return Math.max(0, Math.min(100, Math.round(safe)));
}

export function summarizeCareerEvaluationStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "complete" || normalized === "completed") return "Evaluacion disponible";
  if (normalized === "missing") return "Sin evaluacion visible";
  return "Estado de evaluacion no disponible";
}

export function formatCareerRequirementValue(
  requirement?: Pick<PartnerPortalCareerRequirement, "valueType" | "currency" | "currentValue"> | null,
  value?: string | number | null
) {
  const target = value ?? requirement?.currentValue ?? null;
  if (target === null || target === undefined || target === "") return "Sin dato";
  if (requirement?.valueType === "currency") {
    return formatPortalMoney(target, requirement.currency || "ARS");
  }
  if (typeof target === "number") return String(target);
  const numeric = Number(target);
  if (Number.isFinite(numeric) && String(target).trim() !== "") {
    return requirement?.valueType === "count" ? String(Math.round(numeric)) : String(target);
  }
  return String(target);
}

export function summarizeCareerRequirementGap(requirement?: PartnerPortalCareerRequirement | null) {
  if (!requirement) return "Sin informacion disponible";
  if (requirement.completed) return "Objetivo cumplido";
  const remaining = formatCareerRequirementValue(requirement, requirement.remainingValue);
  if (requirement.code === "active_clients") return `Te faltan ${remaining} clientes`;
  return `Te faltan ${remaining}`;
}

export function formatPortalDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Sin dato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin dato";
  return new Intl.DateTimeFormat("es-AR", options || { dateStyle: "medium" }).format(date);
}

export function formatPortalDateTime(value?: string | null) {
  if (!value) return "Sin dato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin dato";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatPortalMoney(value?: string | number | null, currency = "ARS") {
  const amount = typeof value === "number" ? value : Number(value || 0);
  if (!Number.isFinite(amount)) return "No disponible";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export function safePartnerName(partner?: PartnerPortalPartner | null, fallback = "Asesor") {
  return String(partner?.profile?.displayName || "").trim() || String(partner?.profile?.legalName || "").trim() || String(partner?.email || "").trim() || fallback;
}

export function isOpaqueIdentifier(value?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

export function summarizeAttributionStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "Activo";
  if (normalized === "ended") return "Finalizado";
  if (normalized === "cancelled") return "Cancelado";
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Sin estado";
}

export function summarizeAttributionSource(source?: string | null) {
  const normalized = String(source || "").trim().toLowerCase();
  if (normalized === "manual_admin") return "Asignacion manual";
  if (normalized === "sales_event") return "Evento comercial";
  if (normalized === "migration") return "Migracion";
  if (normalized === "referral") return "Referido";
  if (!normalized) return "No informado";
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function normalizePartnerBillingState(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function resolvePartnerClientPaymentState(client?: PartnerPortalClientAttribution | null) {
  const paymentStatus = normalizePartnerBillingState(client?.billing?.paymentStatus);
  if (paymentStatus === "current" || paymentStatus === "pending" || paymentStatus === "overdue" || paymentStatus === "canceled") {
    return paymentStatus;
  }

  const subscriptionStatus = normalizePartnerBillingState(client?.billing?.subscriptionStatus);
  if (subscriptionStatus === "active") return "current";
  if (subscriptionStatus === "pending" || subscriptionStatus === "paused") return "pending";
  if (subscriptionStatus === "payment_failed") return "overdue";
  if (subscriptionStatus === "canceled" || subscriptionStatus === "cancelled" || subscriptionStatus === "suspended") return "canceled";
  return "unknown";
}

export function summarizePartnerBillingState(state?: string | null) {
  const normalized = normalizePartnerBillingState(state);
  if (normalized === "current") return "Al dia";
  if (normalized === "pending") return "Pendiente";
  if (normalized === "overdue") return "Vencido";
  if (normalized === "canceled") return "Cancelado";
  return "Sin informacion";
}

export function summarizePartnerSubscriptionStatus(status?: string | null) {
  const normalized = normalizePartnerBillingState(status);
  if (normalized === "active") return "Suscripcion activa";
  if (normalized === "pending") return "Suscripcion pendiente";
  if (normalized === "paused") return "Suscripcion pausada";
  if (normalized === "payment_failed") return "Pago rechazado";
  if (normalized === "suspended") return "Suscripcion suspendida";
  if (normalized === "canceled" || normalized === "cancelled") return "Suscripcion cancelada";
  return "Sin informacion";
}

export function partnerBillingVariant(state?: string | null) {
  const normalized = normalizePartnerBillingState(state);
  if (normalized === "current") return "success" as const;
  if (normalized === "pending") return "warning" as const;
  if (normalized === "overdue" || normalized === "canceled") return "danger" as const;
  return "muted" as const;
}

export function hasPartnerClientBilling(client?: PartnerPortalClientAttribution | null) {
  return Boolean(
    client?.billing
    && (
      client.billing.paymentStatus
      || client.billing.subscriptionStatus
      || client.billing.planName
      || client.billing.lastAccreditedPaymentAt
      || client.billing.nextPaymentAt
    )
  );
}

export function resolvePartnerClientDisplayName(client?: PartnerPortalClientAttribution | null, index = 0) {
  const clinicName = String(client?.clinicName || "").trim();
  if (clinicName) return clinicName;

  const source = String(client?.attributionSource || "").trim();
  if (source && !isOpaqueIdentifier(source)) {
    return `Cliente por ${summarizeAttributionSource(source).toLowerCase()}`;
  }

  const fallbackNumber = Number.isFinite(index) ? index + 1 : null;
  return fallbackNumber ? `Cliente atribuido ${fallbackNumber}` : "Cliente atribuido";
}

export function getPartnerPortalPreviewData() {
  const partner: PartnerPortalPartner = {
    id: "preview-partner",
    email: "lucia@asesores-opturon.test",
    status: "active",
    createdAt: "2026-02-10T14:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
    lastLoginAt: "2026-06-19T14:35:00.000Z",
    profile: {
      code: "OPT-LF-01",
      displayName: "Lucia Ferrer",
      legalName: "Lucia Ferrer",
      phone: "+54 9 11 5555 2211",
      notes: "Preview de desarrollo"
    },
    sponsorPartnerId: null,
    activeAttributionCount: 4,
    currentRankCode: "lider"
  };

  const summary: PartnerPortalSummary = {
    activeClients: 4,
    generatedCommissions: "184500.00",
    latestRank: "lider"
  };

  const clients: PartnerPortalClientAttribution[] = [
    {
      id: "preview-client-1",
      partnerId: partner.id,
      clinicId: "clinic-1",
      tenantId: "tenant-1",
      status: "active",
      attributionSource: "manual_admin",
      attributedAt: "2026-06-18T09:00:00.000Z",
      clinicName: "Clinica Delta",
      notes: "Onboarding comercial completo",
      billing: {
        subscriptionStatus: "active",
        paymentStatus: "current",
        planName: "Plan Crecimiento",
        lastAccreditedPaymentAt: "2026-06-12T13:10:00.000Z",
        nextPaymentAt: "2026-07-12T13:10:00.000Z"
      }
    },
    {
      id: "preview-client-2",
      partnerId: partner.id,
      clinicId: "clinic-2",
      tenantId: "tenant-2",
      status: "active",
      attributionSource: "manual_admin",
      attributedAt: "2026-06-14T16:00:00.000Z",
      clinicName: "Estudio Nexo",
      notes: "Implementacion inicial coordinada",
      billing: {
        subscriptionStatus: "pending",
        paymentStatus: "pending",
        planName: "Plan Inicial",
        lastAccreditedPaymentAt: null,
        nextPaymentAt: "2026-06-26T10:00:00.000Z"
      }
    },
    {
      id: "preview-client-3",
      partnerId: partner.id,
      clinicId: "clinic-3",
      tenantId: "tenant-3",
      status: "ended",
      attributionSource: "manual_admin",
      attributedAt: "2026-05-20T11:30:00.000Z",
      endedAt: "2026-06-10T17:30:00.000Z",
      clinicName: "Consultora Boreal",
      notes: "Atribucion cerrada",
      billing: {
        subscriptionStatus: "canceled",
        paymentStatus: "canceled",
        planName: "Plan Empresa",
        lastAccreditedPaymentAt: "2026-05-28T17:30:00.000Z",
        nextPaymentAt: null
      }
    }
  ];

  const rankHistory: PartnerPortalRankHistoryEntry[] = [
    {
      id: "preview-rank-1",
      partnerId: partner.id,
      rankCode: "lider",
      effectiveFrom: "2026-06-01T12:00:00.000Z",
      effectiveTo: null,
      notes: "partner_rank_evaluated",
      createdAt: "2026-06-01T12:00:00.000Z"
    },
    {
      id: "preview-rank-2",
      partnerId: partner.id,
      rankCode: "asesor",
      effectiveFrom: "2026-03-05T12:00:00.000Z",
      effectiveTo: "2026-06-01T12:00:00.000Z",
      notes: "partner_rank_evaluated",
      createdAt: "2026-03-05T12:00:00.000Z"
    }
  ];

  const careerProgress: PartnerPortalCareerProgress = {
    currentRank: "lider",
    nextRank: "coordinador",
    progressPercent: 67,
    evaluationStatus: "complete",
    evaluatedAt: "2026-06-18T14:00:00.000Z",
    windowStart: "2026-05-19T00:00:00.000Z",
    windowEnd: "2026-06-18T23:59:59.000Z",
    requirements: [
      {
        code: "active_clients",
        label: "Clientes activos",
        currentValue: 4,
        targetValue: 6,
        remainingValue: 2,
        completed: false,
        valueType: "count",
        currency: null
      },
      {
        code: "generated_commission",
        label: "Objetivo comercial acreditado",
        currentValue: "184500.00",
        targetValue: "220000.00",
        remainingValue: "35500.00",
        completed: false,
        valueType: "currency",
        currency: "ARS"
      }
    ],
    rankHistory,
    latestEvaluation: {
      currentRankCode: "lider",
      nextRankCode: "coordinador"
    }
  };

  return { partner, summary, clients, rankHistory, careerProgress };
}
