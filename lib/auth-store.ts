import type { GlobalRole } from "@/lib/saas/types";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  globalRole?: string;
};

function normalizeRole(input?: string): GlobalRole {
  const allowed: GlobalRole[] = ["superadmin", "ops_admin", "sales_rep", "support_agent", "client"];
  if (input && allowed.includes(input as GlobalRole)) return input as GlobalRole;
  return "superadmin";
}

export async function getAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return null;

  // 1) PROD FIRST / ENV-FIRST: robust for serverless deployments.
  const envEmail = String(process.env.AUTH_ADMIN_EMAIL || "").toLowerCase().trim();
  const envHash = String(process.env.AUTH_ADMIN_PASSWORD_HASH || "").trim();
  if (envEmail && envHash && e === envEmail) {
    return {
      id: "env-admin",
      email: String(process.env.AUTH_ADMIN_EMAIL || envEmail),
      name: process.env.AUTH_ADMIN_NAME || "Admin",
      passwordHash: envHash,
      globalRole: normalizeRole(process.env.AUTH_ADMIN_GLOBAL_ROLE || "superadmin")
    };
  }

  // 2) DEV fallback: JSON store (never throw in runtime).
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dataPath = path.join(process.cwd(), "data", "saas.json");
    if (!fs.existsSync(dataPath)) return null;
    const raw = fs.readFileSync(dataPath, "utf8");
    const db = JSON.parse(raw) as { users?: any[] };
    const users = Array.isArray(db.users) ? db.users : [];
    const u = users.find((x: any) => String(x?.email || "").toLowerCase().trim() === e);
    if (!u?.passwordHash) return null;
    return {
      id: String(u.id || "json-admin"),
      email: String(u.email || e),
      name: u.name ? String(u.name) : undefined,
      passwordHash: String(u.passwordHash),
      globalRole: normalizeRole(String(u.globalRole || u.role || "superadmin"))
    };
  } catch (err) {
    console.warn("AUTH_JSON_STORE_UNAVAILABLE", String(err));
    return null;
  }
}
