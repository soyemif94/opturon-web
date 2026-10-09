import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiBase = getApiBaseUrl();
  if (!apiBase) return NextResponse.json({ error: "backend_unavailable" }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const response = await fetch(`${apiBase}/api/partners/public-advisor-applications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const payload = await response.json().catch(() => ({ error: "public_advisor_application_failed" }));
  return NextResponse.json(payload, { status: response.status, headers: { "Cache-Control": "no-store" } });
}
