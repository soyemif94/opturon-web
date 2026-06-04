import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashSync } from "bcryptjs";
import { newId, readSaasData, writeSaasData } from "@/lib/saas/store";

type LocalPortalInvitationRecord = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  userId: string;
  email: string;
  name: string;
  role: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
};

type LocalPortalInvitationStore = {
  invitations: LocalPortalInvitationRecord[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "portal-user-invitations.json");
const INVITATION_EXPIRES_IN_HOURS = 168;

function emptyStore(): LocalPortalInvitationStore {
  return {
    invitations: []
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStore(parsed?: Partial<LocalPortalInvitationStore> | null): LocalPortalInvitationStore {
  return {
    invitations: Array.isArray(parsed?.invitations) ? parsed!.invitations : []
  };
}

function readStore(): LocalPortalInvitationStore {
  try {
    if (!existsSync(DATA_FILE)) {
      return emptyStore();
    }

    const raw = readFileSync(DATA_FILE, "utf8");
    return normalizeStore(JSON.parse(raw) as Partial<LocalPortalInvitationStore>);
  } catch {
    return emptyStore();
  }
}

function writeStore(data: LocalPortalInvitationStore) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(normalizeStore(data), null, 2), "utf8");
}

function hashToken(token: string) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function resolveAppBaseUrl() {
  return String(
    process.env.PORTAL_INVITATION_BASE_URL ||
      process.env.PASSWORD_RESET_BASE_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      ""
  )
    .trim()
    .replace(/\/$/, "");
}

function resolveInvitationEmailFrom() {
  return String(process.env.PORTAL_INVITATION_EMAIL_FROM || process.env.RESET_EMAIL_FROM || "").trim();
}

function roleLabel(role: string) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "owner") return "Propietario";
  if (normalized === "manager") return "Gerente";
  if (normalized === "seller") return "Vendedor";
  if (normalized === "viewer") return "Visualizador";
  return "Usuario";
}

export function buildPortalInvitationAcceptLink(token: string) {
  const appBaseUrl = resolveAppBaseUrl();
  if (!appBaseUrl) {
    throw new Error("portal_invitation_base_url_not_configured");
  }
  return `${appBaseUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
}

export async function sendPortalUserInvitationEmail(input: {
  email: string;
  invitedName: string;
  tenantName?: string | null;
  role: string;
  acceptLink: string;
  expiresAt: string;
}) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = resolveInvitationEmailFrom();

  if (!apiKey || !from) {
    throw new Error("portal_invitation_email_not_configured");
  }

  const tenantName = String(input.tenantName || "").trim() || "tu espacio de Opturon";
  const expiresAtText = new Date(input.expiresAt).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: `Invitacion a ${tenantName} en Opturon`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;background:#f6f3ee;padding:24px;">
          <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #eadfd2;">
            <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a16207;font-weight:700;">Opturon</div>
            <h1 style="margin:12px 0 8px;font-size:28px;line-height:1.2;color:#111827;">Tu acceso esta listo</h1>
            <p style="margin:0 0 16px;color:#4b5563;">
              ${input.invitedName ? `Hola ${input.invitedName},` : "Hola,"} te invitaron a ingresar a <strong>${tenantName}</strong> en Opturon con el rol <strong>${roleLabel(input.role)}</strong>.
            </p>
            <p style="margin:0 0 20px;color:#4b5563;">
              Para activar tu cuenta, crea tu contrasena desde el siguiente enlace seguro:
            </p>
            <p style="margin:0 0 24px;">
              <a href="${input.acceptLink}" style="display:inline-block;padding:12px 18px;background:#c05000;color:#fff;text-decoration:none;border-radius:12px;font-weight:700;">
                Activar cuenta
              </a>
            </p>
            <p style="margin:0 0 8px;color:#4b5563;">Este enlace vence el ${expiresAtText}.</p>
            <p style="margin:0;color:#6b7280;font-size:14px;">
              Si no esperabas esta invitacion, puedes ignorar este email.
            </p>
          </div>
        </div>
      `
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`portal_invitation_email_failed_${response.status}:${body}`);
  }
}

export function createLocalPortalUserInvitation(input: {
  tenantId: string;
  tenantName?: string | null;
  userId: string;
  email: string;
  name: string;
  role: string;
}) {
  const token = randomBytes(32).toString("hex");
  const data = readStore();
  const now = Date.now();
  const normalizedEmail = normalizeEmail(input.email);

  data.invitations = data.invitations.map((item) => {
    if (item.userId === input.userId && !item.acceptedAt && !item.revokedAt) {
      return { ...item, revokedAt: new Date(now).toISOString() };
    }
    return item;
  });

  const record: LocalPortalInvitationRecord = {
    id: newId("invite"),
    tenantId: input.tenantId,
    tenantName: input.tenantName || null,
    userId: input.userId,
    email: normalizedEmail,
    name: String(input.name || "").trim(),
    role: String(input.role || "").trim(),
    tokenHash: hashToken(token),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + INVITATION_EXPIRES_IN_HOURS * 60 * 60 * 1000).toISOString(),
    acceptedAt: null,
    revokedAt: null
  };

  data.invitations.push(record);
  writeStore(data);

  return {
    token,
    invitation: clone(record)
  };
}

export function listLatestLocalPortalInvitationsByTenantId(tenantId: string) {
  const normalizedTenantId = String(tenantId || "").trim();
  const data = readStore();
  const latestByUserId = new Map<string, LocalPortalInvitationRecord>();

  for (const invitation of data.invitations) {
    if (invitation.tenantId !== normalizedTenantId) continue;
    const current = latestByUserId.get(invitation.userId);
    if (!current || new Date(invitation.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      latestByUserId.set(invitation.userId, clone(invitation));
    }
  }

  return latestByUserId;
}

export function resolveLocalPortalInvitation(token: string) {
  const safeToken = String(token || "").trim();
  if (!safeToken || safeToken.length < 20) return null;

  const invitation = readStore().invitations.find((item) => item.tokenHash === hashToken(safeToken));
  if (!invitation) return null;
  if (invitation.acceptedAt || invitation.revokedAt) return null;
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) return null;

  return clone(invitation);
}

export function acceptLocalPortalInvitation(token: string, password: string) {
  const safePassword = String(password || "");
  if (safePassword.length < 8) {
    throw new Error("invalid_invitation_acceptance");
  }

  const data = readStore();
  const invitation = data.invitations.find((item) => item.tokenHash === hashToken(String(token || "").trim()));
  if (!invitation) {
    throw new Error("invalid_or_expired_invitation");
  }
  if (invitation.acceptedAt || invitation.revokedAt) {
    throw new Error("invalid_or_expired_invitation");
  }
  if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
    throw new Error("invalid_or_expired_invitation");
  }

  const saas = readSaasData();
  const user = saas.users.find((item) => item.id === invitation.userId);
  if (!user) {
    throw new Error("invited_user_not_found");
  }

  user.passwordHash = hashSync(safePassword, 10);
  writeSaasData(saas);

  invitation.acceptedAt = new Date().toISOString();
  data.invitations = data.invitations.map((item) => {
    if (item.userId !== invitation.userId || item.id === invitation.id || item.acceptedAt || item.revokedAt) {
      return item;
    }
    return { ...item, revokedAt: new Date().toISOString() };
  });
  writeStore(data);

  return {
    tenantId: invitation.tenantId,
    tenantName: invitation.tenantName,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: invitation.role
    }
  };
}

export function getLocalPortalInvitationSummary(token: string) {
  const invitation = resolveLocalPortalInvitation(token);
  if (!invitation) return null;

  return {
    tenantId: invitation.tenantId,
    tenantName: invitation.tenantName,
    userId: invitation.userId,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    expiresAt: invitation.expiresAt
  };
}
