import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasOpsAccessCookie } from "@/lib/ops-access";
import { requireAppModuleApi } from "@/lib/saas/access";

export async function GET() {
  const auth = await requireAppModuleApi("ops");
  if (auth.error) return auth.error;

  const cookieStore = await cookies();
  if (!hasOpsAccessCookie(cookieStore)) {
    return NextResponse.json({ error: "ops_access_required" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
