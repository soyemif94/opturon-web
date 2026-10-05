import { NextRequest, NextResponse } from "next/server";
import { createPortalSaasCheckout, getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, isPortalInternalAuthConfigured } from "@/lib/api";
import { isSameOriginJsonRequest, resolvePortalBillingSession, trustedClientIpHint } from "@/lib/portal-billing-session";

export const runtime = "nodejs";

const fixedPlanKeys = new Set(["core", "growth", "distribution"]);
const safeErrors = new Set([
  "invalid_plan_key", "enterprise_contact_required", "billing_actor_forbidden", "tenant_not_found",
  "subscription_already_exists", "subscription_multiple_non_terminal", "subscription_provisioning_requires_reconciliation",
  "subscription_contract_required", "checkout_contract_unavailable", "checkout_authorization_unavailable",
  "existing_checkout_terms_changed", "billing_request_failed"
]);

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginJsonRequest(request)) return noStore(NextResponse.json({ error: "invalid_request_origin" }, { status: 403 }));
  const actor = await resolvePortalBillingSession();
  if (!actor) return noStore(NextResponse.json({ error: "billing_actor_forbidden" }, { status: 403 }));
  if (!isBackendConfigured() || !isPortalInternalAuthConfigured()) {
    return noStore(NextResponse.json({ error: "checkout_unavailable" }, { status: 503 }));
  }

  let body: unknown;
  try { body = await request.json(); } catch { return noStore(NextResponse.json({ error: "invalid_request" }, { status: 400 })); }
  if (!body || typeof body !== "object" || Array.isArray(body)
    || Object.keys(body).length !== 1 || !Object.hasOwn(body, "planKey")) {
    return noStore(NextResponse.json({ error: "invalid_request" }, { status: 400 }));
  }
  const planKey = (body as { planKey?: unknown }).planKey;
  if (typeof planKey !== "string" || !fixedPlanKeys.has(planKey)) {
    return noStore(NextResponse.json({ error: "invalid_plan_key" }, { status: 400 }));
  }

  try {
    const result = await createPortalSaasCheckout(actor.tenantId, actor.actorUserId, planKey, trustedClientIpHint(request));
    const url = new URL(result.data.authorizationUrl);
    if (url.protocol !== "https:" || !/(^|\.)mercadopago\.com(\.ar)?$/i.test(url.hostname)) {
      return noStore(NextResponse.json({ error: "checkout_authorization_unavailable" }, { status: 502 }));
    }
    return noStore(NextResponse.json({ checkout: result.data }, { status: result.data.reused ? 200 : 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error) as { error?: unknown; contactPath?: unknown } | undefined;
    const errorCode = String(backendBody?.error || "");
    const status = getBackendErrorStatus(error) || 502;
    return noStore(NextResponse.json({
      error: safeErrors.has(errorCode) ? errorCode : "checkout_unavailable",
      ...(errorCode === "enterprise_contact_required" && backendBody?.contactPath === "/contacto" ? { contactPath: "/contacto" } : {})
    }, { status }));
  }
}
