import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  callPartnerRecruitmentBackend,
  getRecruitmentBackendErrorBody,
  getRecruitmentBackendErrorStatus
} from "@/lib/partner-recruitment-applications-api";
import { requirePartnerApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function errorResponse(error: unknown) {
  return noStore(
    NextResponse.json(
      getRecruitmentBackendErrorBody(error) || { error: "partner_recruitment_proxy_failed" },
      { status: getRecruitmentBackendErrorStatus(error) || 502 }
    )
  );
}

function assertNoSponsorOverride(payload: Record<string, unknown>) {
  return !("sponsorPartnerId" in payload) && !("sponsorId" in payload);
}

function logTrace(request: NextRequest, guard: Awaited<ReturnType<typeof requirePartnerApi>>, traceId: string) {
  const session = guard.ctx?.session;
  console.info("partner_identity_trace", {
    event: "partner_identity_trace",
    layer: "next_proxy",
    traceId,
    requestPath: request.nextUrl.pathname,
    authUserId: session?.user?.id || null,
    sessionPartnerId: session?.user?.partnerId || null,
    resolvedPartnerId: guard.partnerId,
    forwardedPartnerId: guard.partnerId
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ applicationId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const traceId = randomUUID();
  logTrace(request, guard, traceId);
  const { applicationId } = await context.params;
  try {
    const result = await callPartnerRecruitmentBackend(
      `/api/partners/me/recruitment-applications/${encodeURIComponent(applicationId)}`,
      { method: "GET" },
      { partnerId: guard.partnerId, traceId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ applicationId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const traceId = randomUUID();
  logTrace(request, guard, traceId);
  const { applicationId } = await context.params;
  try {
    const payload = ((await request.json().catch(() => ({}))) || {}) as Record<string, unknown>;
    if (!assertNoSponsorOverride(payload)) {
      return noStore(NextResponse.json({ error: "partner_sponsor_browser_override_forbidden" }, { status: 400 }));
    }
    const result = await callPartnerRecruitmentBackend(
      `/api/partners/me/recruitment-applications/${encodeURIComponent(applicationId)}`,
      { method: "PATCH", body: JSON.stringify(payload) },
      { partnerId: guard.partnerId, traceId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}
