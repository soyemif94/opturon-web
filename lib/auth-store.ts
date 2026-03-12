import type { GlobalRole, TenantRole } from "@/lib/saas/types";
import { getPasswordOverride } from "@/lib/password-reset-store";
import { resolveSaasDataFile } from "@/lib/runtime-data";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  globalRole?: string;
  tenantId?: string;
  tenantRole?: TenantRole;
};

function normalizeRole(input?: string): GlobalRole {
  const allowed: GlobalRole[] = ["superadmin", "ops_admin", "sales_rep", "support_agent", "client"];
  if (input && allowed.includes(input as GlobalRole)) return input as GlobalRole;
  return "superadmin";
}

async function readJsonAuthStore() {
  const fs = await import("node:fs");
  const dataPath = resolveSaasDataFile();
  if (!fs.existsSync(dataPath)) return null;
  const raw = fs.readFileSync(dataPath, "utf8");
  const db = JSON.parse(raw) as { users?: any[]; memberships?: any[] };
  return {
    users: Array.isArray(db.users) ? db.users : [],
    memberships: Array.isArray(db.memberships) ? db.memberships : []
  };
}

export async function getAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return null;
  const passwordOverride = getPasswordOverride(e);

  // 1) PROD FIRST / ENV-FIRST: robust for serverless deployments.
  const envEmail = String(process.env.AUTH_ADMIN_EMAIL || "").toLowerCase().trim();
  const envHash = String(process.env.AUTH_ADMIN_PASSWORD_HASH || "").trim();
  if (envEmail && envHash && e === envEmail) {
    try {
      const db = await readJsonAuthStore();
      const matchedUser = db?.users.find((x: any) => String(x?.email || "").toLowerCase().trim() === e);
      const membership = db?.memberships.find((item: any) => String(item?.userId || "") === String(matchedUser?.id || ""));
      if (matchedUser) {
        return {
          id: String(matchedUser.id || "env-admin"),
          email: String(matchedUser.email || process.env.AUTH_ADMIN_EMAIL || envEmail),
          name: matchedUser.name ? String(matchedUser.name) : process.env.AUTH_ADMIN_NAME || "Admin",
          passwordHash: passwordOverride || envHash,
          globalRole: normalizeRole(String(matchedUser.globalRole || matchedUser.role || process.env.AUTH_ADMIN_GLOBAL_ROLE || "superadmin")),
          tenantId: membership?.tenantId ? String(membership.tenantId) : undefined,
          tenantRole: membership?.role ? String(membership.role) as TenantRole : undefined
        };
      }
    } catch (err) {
      console.warn("AUTH_JSON_LOOKUP_FOR_ENV_ADMIN_FAILED", String(err));
    }

    return {
      id: "env-admin",
      email: String(process.env.AUTH_ADMIN_EMAIL || envEmail),
      name: process.env.AUTH_ADMIN_NAME || "Admin",
      passwordHash: passwordOverride || envHash,
      globalRole: normalizeRole(process.env.AUTH_ADMIN_GLOBAL_ROLE || "superadmin")
    };
  }

  // 2) DEV fallback: JSON store (never throw in runtime).
  try {
    const db = await readJsonAuthStore();
    if (!db) return null;
    const users = db.users;
    const memberships = db.memberships;
    const u = users.find((x: any) => String(x?.email || "").toLowerCase().trim() === e);
    if (!u?.passwordHash) return null;
    const membership = memberships.find((item: any) => String(item?.userId || "") === String(u.id || ""));
    return {
      id: String(u.id || "json-admin"),
      email: String(u.email || e),
      name: u.name ? String(u.name) : undefined,
      passwordHash: passwordOverride || String(u.passwordHash),
      globalRole: normalizeRole(String(u.globalRole || u.role || "superadmin")),
      tenantId: membership?.tenantId ? String(membership.tenantId) : undefined,
      tenantRole: membership?.role ? String(membership.role) as TenantRole : undefined
    };
  } catch (err) {
    console.warn("AUTH_JSON_STORE_UNAVAILABLE", String(err));
    return null;
  }
}
