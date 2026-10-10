import { NextResponse } from "next/server";
import { requireAppApi } from "@/lib/saas/access";
import { appendOpsAccessCookies } from "@/lib/ops/ops-cookie-response";

export async function POST() {
  const auth = await requireAppApi();
  if ("error" in auth) return auth.error;

  return appendOpsAccessCookies(NextResponse.json({ ok: true }), "", 0);
}
