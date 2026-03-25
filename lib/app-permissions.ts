import type { GlobalRole, TenantRole } from "@/lib/saas/types";

export type AppPermission =
  | "view_workspace"
  | "edit_workspace"
  | "manage_workspace"
  | "manage_users"
  | "manage_catalog";
export type AppModule =
  | "home"
  | "inbox"
  | "contacts"
  | "sales"
  | "loyalty"
  | "catalog"
  | "orders"
  | "invoices"
  | "payments"
  | "cash"
  | "agenda"
  | "metrics"
  | "integrations"
  | "settings"
  | "automations"
  | "faqs"
  | "business"
  | "users";

type AccessContext = {
  globalRole?: GlobalRole;
  tenantRole?: TenantRole;
};

const STAFF_ROLES = new Set<GlobalRole>(["superadmin", "ops_admin", "sales_rep", "support_agent"]);

const TENANT_ROLE_PERMISSIONS: Record<TenantRole, Record<AppPermission, boolean>> = {
  owner: {
    view_workspace: true,
    edit_workspace: true,
    manage_workspace: true,
    manage_users: true,
    manage_catalog: true
  },
  manager: {
    view_workspace: true,
    edit_workspace: true,
    manage_workspace: true,
    manage_users: false,
    manage_catalog: true
  },
  seller: {
    view_workspace: true,
    edit_workspace: true,
    manage_workspace: false,
    manage_users: false,
    manage_catalog: false
  },
  viewer: {
    view_workspace: true,
    edit_workspace: false,
    manage_workspace: false,
    manage_users: false,
    manage_catalog: false
  }
};

const TENANT_ROLE_MODULES: Record<TenantRole, AppModule[]> = {
  owner: ["home", "inbox", "contacts", "sales", "loyalty", "catalog", "orders", "invoices", "payments", "cash", "agenda", "metrics", "integrations", "settings", "automations", "faqs", "business", "users"],
  manager: ["home", "inbox", "contacts", "sales", "loyalty", "catalog", "orders", "invoices", "payments", "cash", "agenda", "metrics", "integrations", "settings", "automations", "faqs", "business"],
  seller: ["home", "inbox", "contacts", "sales", "loyalty", "agenda", "orders", "invoices", "payments", "cash", "catalog"],
  viewer: ["home", "inbox", "sales", "loyalty", "orders", "invoices", "payments", "cash", "catalog", "metrics"]
};

export function normalizeTenantRole(role?: string): TenantRole | undefined {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "editor") return "seller";
  const allowed: TenantRole[] = ["owner", "manager", "seller", "viewer"];
  if (allowed.includes(normalized as TenantRole)) return normalized as TenantRole;
  return undefined;
}

export function isStaffRole(role?: GlobalRole) {
  return Boolean(role && STAFF_ROLES.has(role));
}

export function hasAppPermission(context: AccessContext, permission: AppPermission) {
  if (isStaffRole(context.globalRole)) return true;
  const tenantRole = normalizeTenantRole(context.tenantRole);
  if (!tenantRole) return false;
  return TENANT_ROLE_PERMISSIONS[tenantRole]?.[permission] === true;
}

export function canAccessAppModule(context: AccessContext, module: AppModule) {
  if (isStaffRole(context.globalRole)) return true;
  const tenantRole = normalizeTenantRole(context.tenantRole);
  if (!tenantRole) return false;
  return TENANT_ROLE_MODULES[tenantRole].includes(module);
}

export function canViewWorkspace(context: AccessContext) {
  return hasAppPermission(context, "view_workspace");
}

export function canEditWorkspace(context: AccessContext) {
  return hasAppPermission(context, "edit_workspace");
}

export function canManageWorkspace(context: AccessContext) {
  return hasAppPermission(context, "manage_workspace");
}

export function canManageUsers(context: AccessContext) {
  return hasAppPermission(context, "manage_users");
}

export function canManageCatalog(context: AccessContext) {
  return hasAppPermission(context, "manage_catalog");
}
