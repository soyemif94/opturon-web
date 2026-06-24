import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  callClientRequestBackend,
  getClientRequestBackendErrorBody,
  getClientRequestBackendErrorStatus
} from "@/lib/partner-client-requests-api";
import { requirePartnerApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const traceId = randomUUID();
  console.info("partner_identity_trace", {
    event: "partner_identity_trace",
    layer: "next_proxy",
    traceId,
    requestPath: new URL(request.url).pathname,
    authUserId: guard.ctx.session?.user?.id || null,
    sessionPartnerId: guard.ctx.session?.user?.partnerId || null,
    resolvedPartnerId: guard.partnerId,
    forwardedPartnerId: guard.partnerId
  });
  const { requestId } = await context.params;
  try {
    const result = await callClientRequestBackend(
      `/api/partners/me/client-requests/${encodeURIComponent(requestId)}/submit`,
      { method: "POST", body: "{}" },
      { partnerId: guard.partnerId, traceId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return noStore(NextResponse.json(getClientRequestBackendErrorBody(error) || { error: "submit_failed" }, { status: getClientRequestBackendErrorStatus(error) || 502 }));
  }
}
