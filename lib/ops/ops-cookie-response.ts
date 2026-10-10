import { NextResponse } from "next/server";
import { OPS_ACCESS_COOKIE, OPS_ACCESS_COOKIE_PATHS, opsAccessCookieOptions } from "./ops-cookie";

// ResponseCookies is keyed by name, not by (name, path). Serializing each
// cookie separately preserves both scoped Set-Cookie headers on the response.
export function appendOpsAccessCookies(response: NextResponse, token: string, maxAge?: number) {
  for (const path of Object.values(OPS_ACCESS_COOKIE_PATHS)) {
    const cookieResponse = new NextResponse(null);
    cookieResponse.cookies.set({
      name: OPS_ACCESS_COOKIE,
      value: token,
      ...opsAccessCookieOptions(path),
      ...(maxAge === undefined ? {} : { maxAge })
    });
    const header = cookieResponse.headers.get("set-cookie");
    if (!header) throw new Error("ops_cookie_serialization_failed");
    response.headers.append("set-cookie", header);
  }
  return response;
}
