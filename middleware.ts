import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { PARTNER_PORTAL_PREVIEW_HEADER } from "@/lib/partners-portal";

const STAFF_ROLES = new Set(["superadmin", "ops_admin", "sales_rep", "support_agent"]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isOps = path.startsWith("/ops");
  const isApp = path.startsWith("/app");
  const isBot = path.startsWith("/bot");
  const isPartners = path.startsWith("/partners");

  if (isBot) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (!isOps && !isApp && !isBot && !isPartners) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const globalRole = String(token.globalRole || "");
  const isPartnerPreview = process.env.NODE_ENV !== "production" && request.nextUrl.searchParams.get("preview") === "1";

  if (isPartners) {
    if (isPartnerPreview && STAFF_ROLES.has(globalRole)) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set(PARTNER_PORTAL_PREVIEW_HEADER, "1");
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    if (globalRole !== "partner") {
      return NextResponse.redirect(new URL("/app", request.url));
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
  matcher: ["/bot/:path*", "/ops/:path*", "/app/:path*", "/partners/:path*"]
};
