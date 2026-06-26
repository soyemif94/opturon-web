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
      getRecruitmentBackendErrorBody(error) || {
        error: "partner_recruitment_proxy_failed",
        detail: error instanceof Error ? error.message : "No se pudo completar la operacion."
      },
      { status: getRecruitmentBackendErrorStatus(error) || 502 }
    )
  );
}

function logPartnerIdentityTrace(input: {
  traceId: string;
  requestPath: string;
  authUserId?: string | null;
  sessionPartnerId?: string | null;
  resolvedPartnerId?: string | null;
  forwardedPartnerId?: string | null;
}) {
  console.info("partner_identity_trace", {
    event: "partner_identity_trace",
    layer: "next_proxy",
    ...input
  });
}

function assertNoSponsorOverride(payload: Record<string, unknown>) {
  return !("sponsorPartnerId" in payload) && !("sponsorId" in payload);
}

export async function GET(request: NextRequest) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const session = guard.ctx?.session;
  const traceId = randomUUID();
  logPartnerIdentityTrace({
    traceId,
    requestPath: request.nextUrl.pathname,
    authUserId: session?.user?.id || null,
    sessionPartnerId: session?.user?.partnerId || null,
    resolvedPartnerId: guard.partnerId,
    forwardedPartnerId: guard.partnerId
  });
  try {
    const suffix = request.nextUrl.searchParams.toString();
    const result = await callPartnerRecruitmentBackend(
      `/api/partners/me/recruitment-applications${suffix ? `?${suffix}` : ""}`,
      { method: "GET" },
      { partnerId: guard.partnerId, traceId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const session = guard.ctx?.session;
  const traceId = randomUUID();
  logPartnerIdentityTrace({
    traceId,
    requestPath: request.nextUrl.pathname,
    authUserId: session?.user?.id || null,
    sessionPartnerId: session?.user?.partnerId || null,
    resolvedPartnerId: guard.partnerId,
    forwardedPartnerId: guard.partnerId
  });
  try {
    const payload = ((await request.json().catch(() => ({}))) || {}) as Record<string, unknown>;
    if (!assertNoSponsorOverride(payload)) {
      return noStore(
        NextResponse.json(
          { error: "partner_sponsor_browser_override_forbidden" },
          { status: 400 }
        )
      );
    }
    const result = await callPartnerRecruitmentBackend(
      "/api/partners/me/recruitment-applications",
      { method: "POST", body: JSON.stringify(payload) },
      { partnerId: guard.partnerId, traceId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}
