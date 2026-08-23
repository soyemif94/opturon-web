const PORTAL_TENANT_PATH_PREFIX = "/portal/tenants/";

export function isPortalTenantBackendPath(path: string) {
  return String(path || "").startsWith(PORTAL_TENANT_PATH_PREFIX);
}

export function applyPortalInternalAuth(path: string, headers: Headers) {
  if (!isPortalTenantBackendPath(path)) return headers;

  const portalKey = String(process.env.PORTAL_INTERNAL_KEY || "").trim();
  if (!portalKey) {
    throw new Error("PORTAL_INTERNAL_KEY is not configured");
  }

  headers.set("x-portal-key", portalKey);
  return headers;
}
