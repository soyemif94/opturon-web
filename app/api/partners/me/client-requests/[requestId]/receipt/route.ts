import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  fetchClientRequestReceipt,
  getClientRequestBackendErrorBody,
  getClientRequestBackendErrorStatus
} from "@/lib/partner-client-requests-api";
import { requirePartnerApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return guard.error;
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
    const backend = await fetchClientRequestReceipt(
      `/api/partners/me/client-requests/${encodeURIComponent(requestId)}/receipt`,
      { partnerId: guard.partnerId, traceId }
    );
    const headers = new Headers();
    headers.set("Content-Type", backend.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", backend.headers.get("content-disposition") || "attachment");
    headers.set("Cache-Control", "private, no-store");
    return new NextResponse(backend.body, { status: 200, headers });
  } catch (error) {
    return NextResponse.json(getClientRequestBackendErrorBody(error) || { error: "receipt_failed" }, { status: getClientRequestBackendErrorStatus(error) || 502 });
  }
}
