import type { GlobalRole, TenantRole } from "@/lib/saas/types";

export type AuthGlobalRole = GlobalRole | "partner";
export type AuthAccountScope = "opturon_admin" | "partner" | "client";

export type AuthIdentityInput = {
  accountScope?: string | null;
  authSource?: string | null;
  globalRole?: string | null;
  partnerId?: string | null;
  tenantId?: string | null;
  tenantRole?: TenantRole | string | null;
};

const STAFF_GLOBAL_ROLES = new Set<AuthGlobalRole>(["superadmin", "ops_admin", "sales_rep", "support_agent"]);
const ALLOWED_SCOPES = new Set<AuthAccountScope>(["opturon_admin", "partner", "client"]);

export function normalizeGlobalRole(role?: string | null): AuthGlobalRole {
  const allowed: AuthGlobalRole[] = ["superadmin", "ops_admin", "sales_rep", "support_agent", "client", "partner"];
  if (role && allowed.includes(role as AuthGlobalRole)) return role as AuthGlobalRole;
  return "client";
}

export function isStaffGlobalRole(role?: string | null) {
  return STAFF_GLOBAL_ROLES.has(normalizeGlobalRole(role));
}

export function normalizeAccountScope(scope?: string | null): AuthAccountScope | undefined {
  const normalized = String(scope || "").trim().toLowerCase();
  if (ALLOWED_SCOPES.has(normalized as AuthAccountScope)) {
    return normalized as AuthAccountScope;
  }
  return undefined;
}

export function resolveAccountScopeForIdentity(input: AuthIdentityInput): AuthAccountScope | undefined {
  const explicitScope = normalizeAccountScope(input.accountScope);
  if (explicitScope) return explicitScope;

  const globalRole = normalizeGlobalRole(input.globalRole);
  const authSource = String(input.authSource || "").trim().toLowerCase();

  if (globalRole === "partner" || String(input.partnerId || "").trim()) {
    return "partner";
  }

  if (authSource === "local" && isStaffGlobalRole(globalRole)) {
    return "opturon_admin";
  }

  if (globalRole === "client" || String(input.tenantId || "").trim() || String(input.tenantRole || "").trim()) {
    return "client";
  }

  return undefined;
}
