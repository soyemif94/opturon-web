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

export async function POST(request: NextRequest, context: { params: Promise<{ applicationId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const session = guard.ctx?.session;
  const traceId = randomUUID();
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
  const { applicationId } = await context.params;
  try {
    const result = await callPartnerRecruitmentBackend(
      `/api/partners/me/recruitment-applications/${encodeURIComponent(applicationId)}/submit`,
      { method: "POST", body: "{}" },
      { partnerId: guard.partnerId, traceId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getRecruitmentBackendErrorBody(error) || { error: "submit_failed" },
        { status: getRecruitmentBackendErrorStatus(error) || 502 }
      )
    );
  }
}
