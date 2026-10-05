import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, isPortalInternalAuthConfigured, registerPortalOwnerAccount } from "@/lib/api";
import { isSameOriginJsonRequest, trustedClientIpHint } from "@/lib/portal-billing-session";

export const runtime = "nodejs";

const allowedFields = new Set(["name", "businessName", "email", "password"]);

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginJsonRequest(request)) return noStore(NextResponse.json({ error: "invalid_request_origin" }, { status: 403 }));
  if (!isBackendConfigured() || !isPortalInternalAuthConfigured()) {
    return noStore(NextResponse.json({ error: "registration_unavailable" }, { status: 503 }));
  }

  let body: unknown;
  try { body = await request.json(); } catch { return noStore(NextResponse.json({ error: "invalid_request" }, { status: 400 })); }
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).some((key) => !allowedFields.has(key))) {
    return noStore(NextResponse.json({ error: "invalid_request" }, { status: 400 }));
  }
  const value = body as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const businessName = typeof value.businessName === "string" ? value.businessName.trim() : "";
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const password = typeof value.password === "string" ? value.password : "";
  if (name.length < 2 || name.length > 120 || businessName.length < 2 || businessName.length > 160
    || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) {
    return noStore(NextResponse.json({ error: "invalid_registration_details" }, { status: 400 }));
  }

  try {
    const result = await registerPortalOwnerAccount({ name, businessName, email, password }, trustedClientIpHint(request));
    return noStore(NextResponse.json({ ok: true, user: result.data }, { status: 201 }));
  } catch (error) {
    const status = getBackendErrorStatus(error) || 502;
    const backendBody = getBackendErrorBody(error) as { error?: unknown } | undefined;
    const errorCode = String(backendBody?.error || "");
    const safeErrors = new Set(["email_already_registered", "invalid_request", "registration_unavailable"]);
    return noStore(NextResponse.json({ error: safeErrors.has(errorCode) ? errorCode : "registration_unavailable" }, { status }));
  }
}
