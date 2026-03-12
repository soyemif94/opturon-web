import type { GlobalRole, TenantRole } from "@/lib/saas/types";

export type AppPermission = "view_workspace" | "edit_workspace" | "manage_workspace" | "manage_users";

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
    manage_users: true
  },
  manager: {
    view_workspace: true,
    edit_workspace: true,
    manage_workspace: true,
    manage_users: true
  },
  editor: {
    view_workspace: true,
    edit_workspace: true,
    manage_workspace: false,
    manage_users: false
  },
  viewer: {
    view_workspace: true,
    edit_workspace: false,
    manage_workspace: false,
    manage_users: false
  }
};

export function isStaffRole(role?: GlobalRole) {
  return Boolean(role && STAFF_ROLES.has(role));
}

export function hasAppPermission(context: AccessContext, permission: AppPermission) {
  if (isStaffRole(context.globalRole)) return true;
  if (!context.tenantRole) return false;
  return TENANT_ROLE_PERMISSIONS[context.tenantRole]?.[permission] === true;
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
