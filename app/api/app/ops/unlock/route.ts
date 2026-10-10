import { NextResponse } from "next/server";
import { requireAppApi } from "@/lib/saas/access";
import {
  createOpsAccessToken,
  isOpsAccessConfigured,
  validateOpsPassword
} from "@/lib/ops-access";
import { appendOpsAccessCookies } from "@/lib/ops/ops-cookie-response";

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

  return appendOpsAccessCookies(NextResponse.json({ ok: true }), token);
}
