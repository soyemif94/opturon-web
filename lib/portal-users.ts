export function normalizePortalUserRole(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "editor" ? "seller" : normalized;
}

export function isOperationalPortalAssigneeRole(value?: string | null) {
  const role = normalizePortalUserRole(value);
  return role === "manager" || role === "seller";
}

export function isOperationalPortalAssigneeUser(user?: { role?: string | null; isOperationalAssignee?: boolean | null } | null) {
  if (!user) return false;
  if (typeof user.isOperationalAssignee === "boolean") {
    return user.isOperationalAssignee;
  }
  return isOperationalPortalAssigneeRole(user.role);
}

export function portalUserRoleLabel(value?: string | null, accountKind?: string | null) {
  const role = normalizePortalUserRole(value);
  if (role === "owner" || String(accountKind || "").trim().toLowerCase() === "primary") return "Cliente";
  if (role === "manager") return "Manager";
  if (role === "seller") return "Vendedor";
  if (role === "viewer") return "Solo lectura";
  return "Usuario";
}
