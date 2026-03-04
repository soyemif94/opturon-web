import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const STAFF_ROLES = new Set(["superadmin", "ops_admin", "sales_rep", "support_agent"]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isOps = path.startsWith("/ops");
  const isApp = path.startsWith("/app");
  const isBot = path.startsWith("/bot");

  if (!isOps && !isApp && !isBot) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const globalRole = String(token.globalRole || "");

  if (isOps && !STAFF_ROLES.has(globalRole)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (isApp && !token.tenantId && !STAFF_ROLES.has(globalRole)) {
    return NextResponse.redirect(new URL("/bot", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/bot/:path*", "/ops/:path*", "/app/:path*"]
};

