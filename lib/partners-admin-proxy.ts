import { callAdminPartnersBackend } from "./partners-admin-api";

type AdminContext = {
  session?: {
    user?: {
      id?: string;
      accountScope?: string;
    };
  } | null;
  userId?: string;
  globalRole?: string;
  accountScope?: string;
};

type ProxyPlan = {
  path: string;
  init: RequestInit;
};

const BODY_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function encodePathSegment(segment: string) {
  return encodeURIComponent(String(segment || "").trim());
}

function withSearch(path: string, searchParams?: URLSearchParams | null) {
  const search = searchParams?.toString();
  return search ? `${path}?${search}` : path;
}

export function resolveAdminPartnersBackendPath(method: string, slug: string[] = [], searchParams?: URLSearchParams | null) {
  const normalizedMethod = String(method || "").trim().toUpperCase();
  const segments = slug.map((segment) => String(segment || "").trim()).filter(Boolean);

  if (segments.length === 0) {
    if (normalizedMethod === "GET" || normalizedMethod === "POST") {
      return withSearch("/api/admin/partners", searchParams);
    }
    throw new Error("unsupported_admin_partners_route");
  }

  if (segments.length === 1 && segments[0] === "invite" && normalizedMethod === "POST") {
    return withSearch("/api/admin/partners/invite", searchParams);
  }

  if (segments[0] === "commission-plans") {
    if (segments.length === 1 && (normalizedMethod === "GET" || normalizedMethod === "POST")) {
      return withSearch("/api/admin/partners/commission-plans", searchParams);
    }
    if (segments.length === 3 && segments[2] === "versions" && normalizedMethod === "POST") {
      return withSearch(
        `/api/admin/partners/commission-plans/${encodePathSegment(segments[1])}/versions`,
        searchParams
      );
    }
    throw new Error("unsupported_admin_partners_route");
  }

  if (segments[0] === "commissions") {
    if (segments.length === 2 && normalizedMethod === "POST") {
      const allowedActions = new Set(["simulate", "generate-controlled", "reverse-controlled"]);
      if (allowedActions.has(segments[1])) {
        return withSearch(`/api/admin/partners/commissions/${encodePathSegment(segments[1])}`, searchParams);
      }
    }
    throw new Error("unsupported_admin_partners_route");
  }

  if (segments.length === 1 && normalizedMethod === "GET") {
    return withSearch(`/api/admin/partners/${encodePathSegment(segments[0])}`, searchParams);
  }

  if (segments.length === 2 && normalizedMethod === "PATCH" && segments[1] === "status") {
    return withSearch(`/api/admin/partners/${encodePathSegment(segments[0])}/status`, searchParams);
  }

  if (segments.length === 2 && normalizedMethod === "POST" && segments[1] === "resend-invite") {
    return withSearch(`/api/admin/partners/${encodePathSegment(segments[0])}/resend-invite`, searchParams);
  }

  if (segments.length === 2 && normalizedMethod === "POST" && (segments[1] === "sponsor" || segments[1] === "attributions")) {
    return withSearch(
      `/api/admin/partners/${encodePathSegment(segments[0])}/${encodePathSegment(segments[1])}`,
      searchParams
    );
  }

  if (segments.length === 3 && normalizedMethod === "POST" && segments[1] === "rank" && segments[2] === "evaluate") {
    return withSearch(`/api/admin/partners/${encodePathSegment(segments[0])}/rank/evaluate`, searchParams);
  }

  throw new Error("unsupported_admin_partners_route");
}

export async function createAdminPartnersProxyPlan(
  request: Request,
  slug: string[] = []
): Promise<ProxyPlan> {
  const method = String(request.method || "GET").trim().toUpperCase();
  const path = resolveAdminPartnersBackendPath(method, slug, new URL(request.url).searchParams);
  const headers = new Headers();

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const init: RequestInit = {
    method,
    headers
  };

  if (BODY_METHODS.has(method)) {
    const rawBody = await request.text();
    if (rawBody) {
      init.body = rawBody;
    }
  }

  return { path, init };
}

export async function proxyAdminPartnersRequest<T>(
  ctx: AdminContext,
  request: Request,
  slug: string[] = []
): Promise<T> {
  const plan = await createAdminPartnersProxyPlan(request, slug);
  return callAdminPartnersBackend<T>(ctx, plan.path, plan.init);
}
