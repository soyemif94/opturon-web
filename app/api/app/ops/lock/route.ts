import { NextResponse } from "next/server";
import { requireAppApi } from "@/lib/saas/access";
import { OPS_ACCESS_COOKIE, OPS_ACCESS_COOKIE_PATHS, opsAccessCookieOptions } from "@/lib/ops/ops-cookie";

export async function POST() {
  const auth = await requireAppApi();
  if ("error" in auth) return auth.error;

  const response = NextResponse.json({ ok: true });
  for (const path of Object.values(OPS_ACCESS_COOKIE_PATHS)) {
    response.cookies.set({ name: OPS_ACCESS_COOKIE, value: "", ...opsAccessCookieOptions(path), maxAge: 0 });
  }

  return response;
}
