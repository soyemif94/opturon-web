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
      notes: "Onboarding comercial completo"
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
      notes: "Implementacion inicial coordinada"
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
      notes: "Atribucion cerrada"
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

  return { partner, summary, clients, rankHistory };
}
