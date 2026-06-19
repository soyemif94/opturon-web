export type PartnerStatus = "active" | "suspended" | "disabled" | "invited" | "unknown";
export type PartnerStatusFilter = "all" | "active" | "suspended" | "inactive";
export type PartnerRankFilter = "all" | "sin_rango" | "asesor" | "lider" | "coordinador" | "emperador";
export type PartnerSort = "recent" | "oldest" | "name" | "last_login";

export type AdminPartnerProfile = {
  code?: string | null;
  displayName?: string | null;
  legalName?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type AdminPartner = {
  id: string;
  email: string;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastLoginAt?: string | null;
  profile?: AdminPartnerProfile | null;
  sponsorPartnerId?: string | null;
  activeAttributionCount?: number | null;
  currentRankCode?: string | null;
};

export type AdminPartnerAttribution = {
  id: string;
  tenantId?: string | null;
  clinicName?: string | null;
  status?: string | null;
  attributionSource?: string | null;
  notes?: string | null;
  attributedAt?: string | null;
  endedAt?: string | null;
};

export type AdminPartnerAuditEntry = {
  id: string;
  action?: string | null;
  reason?: string | null;
  actorType?: string | null;
  createdAt?: string | null;
};

export type AdminPartnerDetails = {
  ok: boolean;
  partner: AdminPartner;
  attributions?: AdminPartnerAttribution[];
  rankHistory?: Array<{ rankCode?: string | null; effectiveFrom?: string | null; effectiveTo?: string | null }>;
  audit?: AdminPartnerAuditEntry[];
};

export type PartnerKpis = {
  total: number;
  active: number;
  attributedClients: number;
  withAssignedRank: number;
};

export type PartnerQueryState = {
  search: string;
  status: PartnerStatusFilter;
  rank: PartnerRankFilter;
  sort: PartnerSort;
};

export type PartnerPreviewBundle = {
  partners: AdminPartner[];
  detailsById: Record<string, AdminPartnerDetails>;
};

export const PARTNERS_ADMIN_ROUTE = "/app/partners";
export const PARTNERS_ADMIN_CREATE_ENABLED = false;
export const PARTNERS_ADMIN_CREATE_TOOLTIP = "Disponible en la proxima etapa";

function normalizeText(value?: string | null) {
  return String(value || "").trim();
}

function normalizeTextLower(value?: string | null) {
  return normalizeText(value).toLowerCase();
}

function toTimestamp(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return 0;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function normalizePartnerStatus(status?: string | null): PartnerStatus {
  const normalized = normalizeTextLower(status);
  if (normalized === "active") return "active";
  if (normalized === "suspended") return "suspended";
  if (normalized === "disabled") return "disabled";
  if (normalized === "invited") return "invited";
  return "unknown";
}

export function normalizePartnerStatusFilterValue(status?: string | null): Exclude<PartnerStatusFilter, "all"> {
  const normalized = normalizePartnerStatus(status);
  if (normalized === "active") return "active";
  if (normalized === "suspended") return "suspended";
  return "inactive";
}

export function getPartnerStatusLabel(status?: string | null) {
  const normalized = normalizePartnerStatus(status);
  if (normalized === "active") return "Activo";
  if (normalized === "suspended") return "Suspendido";
  if (normalized === "invited") return "Invitado";
  if (normalized === "disabled") return "Inactivo";
  return "Sin estado";
}

export function getPartnerStatusTone(status?: string | null) {
  const normalized = normalizePartnerStatus(status);
  if (normalized === "active") return "success" as const;
  if (normalized === "suspended") return "warning" as const;
  if (normalized === "disabled") return "muted" as const;
  if (normalized === "invited") return "outline" as const;
  return "muted" as const;
}

export function normalizePartnerRank(rank?: string | null): Exclude<PartnerRankFilter, "all"> {
  const normalized = normalizeTextLower(rank);
  if (normalized === "asesor" || normalized === "lider" || normalized === "coordinador" || normalized === "emperador") {
    return normalized;
  }
  return "sin_rango";
}

export function getPartnerRankLabel(rank?: string | null) {
  const normalized = normalizePartnerRank(rank);
  if (normalized === "sin_rango") return "Sin rango";
  if (normalized === "lider") return "Lider";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getPartnerRankTone(rank?: string | null) {
  const normalized = normalizePartnerRank(rank);
  if (normalized === "emperador") return "warning" as const;
  if (normalized === "coordinador") return "default" as const;
  if (normalized === "lider") return "success" as const;
  if (normalized === "asesor") return "outline" as const;
  return "muted" as const;
}

export function getPartnerDisplayName(partner: AdminPartner) {
  return normalizeText(partner.profile?.displayName) || normalizeText(partner.profile?.legalName) || normalizeText(partner.email) || "Asesor sin nombre";
}

export function getPartnerCode(partner: AdminPartner) {
  return normalizeText(partner.profile?.code) || "Sin codigo";
}

export function getPartnerPhone(partner: AdminPartner) {
  return normalizeText(partner.profile?.phone) || "No informado";
}

export function getPartnerSponsorLabel(partner: AdminPartner, partnerMap: Map<string, AdminPartner>) {
  const sponsorId = normalizeText(partner.sponsorPartnerId);
  if (!sponsorId) return "Sin sponsor";
  const sponsor = partnerMap.get(sponsorId);
  if (!sponsor) return "Sponsor asignado";
  return getPartnerDisplayName(sponsor);
}

export function formatPartnerDate(value?: string | null) {
  const timestamp = toTimestamp(value);
  if (!timestamp) return "Sin registro";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(timestamp));
}

export function formatPartnerDateTime(value?: string | null) {
  const timestamp = toTimestamp(value);
  if (!timestamp) return "Sin registro";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

export function buildPartnerKpis(partners: AdminPartner[]): PartnerKpis {
  return partners.reduce<PartnerKpis>(
    (acc, partner) => {
      acc.total += 1;
      if (normalizePartnerStatus(partner.status) === "active") acc.active += 1;
      acc.attributedClients += Math.max(0, Number(partner.activeAttributionCount || 0));
      if (normalizePartnerRank(partner.currentRankCode) !== "sin_rango") acc.withAssignedRank += 1;
      return acc;
    },
    { total: 0, active: 0, attributedClients: 0, withAssignedRank: 0 }
  );
}

export function filterAndSortPartners(
  partners: AdminPartner[],
  state: PartnerQueryState,
  partnerMap: Map<string, AdminPartner>
) {
  const term = normalizeTextLower(state.search);
  const filtered = partners.filter((partner) => {
    if (state.status !== "all" && normalizePartnerStatusFilterValue(partner.status) !== state.status) return false;
    if (state.rank !== "all" && normalizePartnerRank(partner.currentRankCode) !== state.rank) return false;

    if (!term) return true;

    const haystack = [
      getPartnerDisplayName(partner),
      partner.email,
      getPartnerCode(partner),
      getPartnerSponsorLabel(partner, partnerMap)
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  filtered.sort((left, right) => {
    if (state.sort === "oldest") {
      return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
    }
    if (state.sort === "name") {
      return getPartnerDisplayName(left).localeCompare(getPartnerDisplayName(right), "es");
    }
    if (state.sort === "last_login") {
      return toTimestamp(right.lastLoginAt) - toTimestamp(left.lastLoginAt);
    }
    return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
  });

  return filtered;
}

export function getPartnerActionAvailability(partner: AdminPartner) {
  const normalizedStatus = normalizePartnerStatus(partner.status);
  const nextStatus: "active" | "suspended" | null =
    normalizedStatus === "active" ? "suspended" : normalizedStatus === "suspended" ? "active" : null;
  return {
    canViewDetail: true,
    canChangeStatus: normalizedStatus === "active" || normalizedStatus === "suspended",
    nextStatus
  };
}

export function getPartnerErrorMessage(status?: number) {
  if (status === 401 || status === 403) {
    return "Tu sesion no tiene permiso para ver la red de asesores.";
  }
  return "No pudimos cargar la red de asesores.";
}

export function buildAuditHeadline(entry: AdminPartnerAuditEntry) {
  const action = normalizeText(entry.action).replace(/_/g, " ");
  const reason = normalizeText(entry.reason).replace(/_/g, " ");
  if (action && reason) return `${action} · ${reason}`;
  if (action) return action;
  if (reason) return reason;
  return "Movimiento registrado";
}

export function getPartnerPreviewBundle(): PartnerPreviewBundle {
  const partners: AdminPartner[] = [
    {
      id: "preview-partner-1",
      email: "lucia@asesores-opturon.test",
      status: "active",
      createdAt: "2026-05-12T10:22:00.000Z",
      updatedAt: "2026-06-16T18:10:00.000Z",
      lastLoginAt: "2026-06-18T14:05:00.000Z",
      profile: {
        code: "LUCIA-NORTE",
        displayName: "Lucia Ferrer",
        legalName: "Lucia Ferrer",
        phone: "+54 9 11 5555 0101",
        notes: "Canal retail premium."
      },
      sponsorPartnerId: "preview-partner-2",
      activeAttributionCount: 4,
      currentRankCode: "lider"
    },
    {
      id: "preview-partner-2",
      email: "matias@asesores-opturon.test",
      status: "active",
      createdAt: "2026-04-03T08:10:00.000Z",
      updatedAt: "2026-06-15T13:30:00.000Z",
      lastLoginAt: "2026-06-17T16:20:00.000Z",
      profile: {
        code: "MATIAS-CENTRO",
        displayName: "Matias Varela",
        legalName: "Matias Varela Consultoria",
        phone: "+54 9 11 5555 0199",
        notes: "Sponsor principal del corredor centro."
      },
      sponsorPartnerId: null,
      activeAttributionCount: 9,
      currentRankCode: "coordinador"
    },
    {
      id: "preview-partner-3",
      email: "sofia@asesores-opturon.test",
      status: "suspended",
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-18T09:40:00.000Z",
      lastLoginAt: "2026-06-10T11:00:00.000Z",
      profile: {
        code: "SOFIA-SUR",
        displayName: "Sofia Quiroga",
        legalName: "Sofia Quiroga",
        phone: "+54 9 351 500 8899",
        notes: "Suspendida preventivamente por revision comercial."
      },
      sponsorPartnerId: "preview-partner-2",
      activeAttributionCount: 1,
      currentRankCode: null
    },
    {
      id: "preview-partner-4",
      email: "bruno@asesores-opturon.test",
      status: "disabled",
      createdAt: "2026-03-15T15:45:00.000Z",
      updatedAt: "2026-05-20T12:15:00.000Z",
      lastLoginAt: null,
      profile: {
        code: "BRUNO-LITORAL",
        displayName: "Bruno Salvatierra",
        legalName: "Bruno Salvatierra",
        phone: null,
        notes: "Alta inicial sin atribuciones activas."
      },
      sponsorPartnerId: null,
      activeAttributionCount: 0,
      currentRankCode: "asesor"
    }
  ];

  const detailsById: Record<string, AdminPartnerDetails> = {
    "preview-partner-1": {
      ok: true,
      partner: partners[0],
      attributions: [
        {
          id: "attr-preview-1",
          tenantId: "tenant_demo_001",
          clinicName: "Casa Central Norte",
          status: "active",
          attributionSource: "manual_admin",
          notes: "Cliente enterprise con onboarding resuelto.",
          attributedAt: "2026-05-20T13:00:00.000Z"
        }
      ],
      rankHistory: [{ rankCode: "lider", effectiveFrom: "2026-06-01T00:00:00.000Z", effectiveTo: null }],
      audit: [{ id: "audit-preview-1", action: "partner_status_reviewed", reason: "active", actorType: "staff", createdAt: "2026-06-18T14:10:00.000Z" }]
    },
    "preview-partner-2": {
      ok: true,
      partner: partners[1],
      attributions: [
        {
          id: "attr-preview-2",
          tenantId: "tenant_demo_002",
          clinicName: "Sucursal Centro",
          status: "active",
          attributionSource: "manual_admin",
          notes: "Sponsor del corredor centro.",
          attributedAt: "2026-04-21T11:30:00.000Z"
        }
      ],
      rankHistory: [{ rankCode: "coordinador", effectiveFrom: "2026-05-10T00:00:00.000Z", effectiveTo: null }],
      audit: [{ id: "audit-preview-2", action: "partner_rank_evaluated", reason: "coordinador", actorType: "staff", createdAt: "2026-06-15T13:31:00.000Z" }]
    },
    "preview-partner-3": {
      ok: true,
      partner: partners[2],
      attributions: [],
      rankHistory: [],
      audit: [{ id: "audit-preview-3", action: "partner_status_changed", reason: "suspended", actorType: "staff", createdAt: "2026-06-18T09:40:00.000Z" }]
    },
    "preview-partner-4": {
      ok: true,
      partner: partners[3],
      attributions: [],
      rankHistory: [{ rankCode: "asesor", effectiveFrom: "2026-03-15T15:45:00.000Z", effectiveTo: "2026-05-20T12:15:00.000Z" }],
      audit: [{ id: "audit-preview-4", action: "partner_created", reason: "disabled", actorType: "staff", createdAt: "2026-03-15T15:46:00.000Z" }]
    }
  };

  return { partners, detailsById };
}
