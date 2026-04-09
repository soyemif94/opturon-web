import { NextResponse } from "next/server";
import { requireAppApi } from "@/lib/saas/access";
import {
  createOpsAccessToken,
  isOpsAccessConfigured,
  OPS_ACCESS_COOKIE,
  OPS_ACCESS_MAX_AGE_SECONDS,
  validateOpsPassword
} from "@/lib/ops-access";

export async function POST(request: Request) {
  const auth = await requireAppApi();
  if ("error" in auth) return auth.error;

  if (!isOpsAccessConfigured()) {
    return NextResponse.json({ error: "ops_access_not_configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const password = String(body?.password || "");

  if (!validateOpsPassword(password)) {
    return NextResponse.json({ error: "invalid_ops_password" }, { status: 401 });
  }

  const token = createOpsAccessToken();
  if (!token) {
    return NextResponse.json({ error: "ops_access_not_configured" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: OPS_ACCESS_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/app/ops",
    maxAge: OPS_ACCESS_MAX_AGE_SECONDS
  });

  return response;
}
