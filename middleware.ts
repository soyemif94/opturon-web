import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import {
  isPartnerPortalHost,
  isLegacyPartnerPortalHost,
  isPartnerPublicPath,
  PARTNER_PORTAL_PREVIEW_HEADER,
  partnerCanonicalUrlForLegacyHost,
  partnerInternalPathForHostPath,
  partnerPublicPathForInternalPath
} from "@/lib/partners-portal";
import { isStrictPartnerIdentity } from "@/lib/auth-identity";

const STAFF_ROLES = new Set(["superadmin", "ops_admin", "sales_rep", "support_agent"]);
const AUTH_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url"
];

function mainAppUrl(pathname = "/app") {
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://www.opturon.com").replace(/\/+$/, "");
  return new URL(pathname, `${configured}/`);
}

function isStrictPartnerToken(token: any) {
  return isStrictPartnerIdentity({
    accountScope: token?.accountScope,
    globalRole: token?.globalRole || token?.role,
    partnerId: token?.partnerId,
    tenantId: token?.tenantId,
    tenantRole: token?.tenantRole
  });
}

function clearAuthCookies(response: NextResponse) {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
    response.cookies.set(name, "", { path: "/", domain: ".opturon.com", maxAge: 0 });
  }
  return response;
}

function partnerLoginRedirect(request: NextRequest, callbackPath = request.nextUrl.pathname) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", `${callbackPath}${request.nextUrl.search}`);
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPartnerHost = isPartnerPortalHost(request.headers.get("host"));
  const isLegacyPartnerHost = isLegacyPartnerPortalHost(request.headers.get("host"));
  const isOps = path.startsWith("/ops");
  const isApp = path.startsWith("/app");
  const isBot = path.startsWith("/bot");
  const isPartners = path.startsWith("/partners") || isPartnerHost;

  if (isLegacyPartnerHost) {
    return NextResponse.redirect(partnerCanonicalUrlForLegacyHost(request.nextUrl), 307);
  }

  if (isPartnerHost && path.startsWith("/partners")) {
    const url = request.nextUrl.clone();
    url.pathname = partnerPublicPathForInternalPath(path);
    return NextResponse.redirect(url);
  }

  if (isBot) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (!isOps && !isApp && !isBot && !isPartners) {
    return NextResponse.next();
  }

  if (isPartnerPublicPath(path)) {
    const url = request.nextUrl.clone();
    if (isPartnerHost) {
      url.pathname = partnerInternalPathForHostPath(path);
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (isPartnerHost && path === "/login") {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.next();
    }
    if (isStrictPartnerToken(token)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return clearAuthCookies(NextResponse.next());
  }

  if (isPartnerHost && (isOps || isApp || isBot)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (isStrictPartnerToken(token)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return clearAuthCookies(NextResponse.redirect(partnerLoginRedirect(request, "/")));
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    const callbackPath = isPartnerHost ? path : request.nextUrl.pathname;
    loginUrl.searchParams.set("callbackUrl", `${callbackPath}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const globalRole = String(token.globalRole || "");
  const isPartnerPreview = process.env.NODE_ENV !== "production" && request.nextUrl.searchParams.get("preview") === "1";

  if (isPartners) {
    if (isPartnerPublicPath(path)) {
      return NextResponse.next();
    }
    if (isPartnerPreview && STAFF_ROLES.has(globalRole)) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(PARTNER_PORTAL_PREVIEW_HEADER, "1");
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (!isStrictPartnerToken(token)) {
      if (isPartnerHost) {
        return clearAuthCookies(NextResponse.redirect(partnerLoginRedirect(request, path)));
      }
      return NextResponse.redirect(new URL("/app", request.url));
    }
    if (isPartnerHost) {
      const url = request.nextUrl.clone();
      url.pathname = partnerInternalPathForHostPath(path);
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (globalRole === "partner") {
    return NextResponse.redirect(new URL("/partners", request.url));
  }

  if (isOps && !STAFF_ROLES.has(globalRole)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/bot/:path*", "/ops/:path*", "/app/:path*", "/partners/:path*", "/", "/clients", "/career", "/network", "/commissions", "/profile", "/invite", "/login"]
};
