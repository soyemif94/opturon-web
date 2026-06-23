import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import {
  isPartnerPortalHost,
  isPartnerPublicPath,
  PARTNER_PORTAL_PREVIEW_HEADER,
  partnerInternalPathForHostPath,
  partnerPublicPathForInternalPath
} from "@/lib/partners-portal";

const STAFF_ROLES = new Set(["superadmin", "ops_admin", "sales_rep", "support_agent"]);

function mainAppUrl(pathname = "/app") {
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://www.opturon.com").replace(/\/+$/, "");
  return new URL(pathname, `${configured}/`);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPartnerHost = isPartnerPortalHost(request.headers.get("host"));
  const isOps = path.startsWith("/ops");
  const isApp = path.startsWith("/app");
  const isBot = path.startsWith("/bot");
  const isPartners = path.startsWith("/partners") || isPartnerHost;

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
    const globalRole = String(token.globalRole || "");
    return globalRole === "partner" ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.redirect(mainAppUrl("/app"));
  }

  if (isPartnerHost && (isOps || isApp || isBot)) {
    return NextResponse.redirect(mainAppUrl(path));
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
    if (globalRole !== "partner") {
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
