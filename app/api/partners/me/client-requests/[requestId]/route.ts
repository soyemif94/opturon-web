import { NextRequest, NextResponse } from "next/server";
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

function errorResponse(error: unknown) {
  return noStore(
    NextResponse.json(
      getClientRequestBackendErrorBody(error) || { error: "partner_client_request_proxy_failed" },
      { status: getClientRequestBackendErrorStatus(error) || 502 }
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

export async function GET(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const traceId = randomUUID();
  logPartnerIdentityTrace({
    traceId,
    requestPath: request.nextUrl.pathname,
    authUserId: guard.ctx.session?.user?.id || null,
    sessionPartnerId: guard.ctx.session?.user?.partnerId || null,
    resolvedPartnerId: guard.partnerId,
    forwardedPartnerId: guard.partnerId
  });
  const { requestId } = await context.params;
  try {
    const result = await callClientRequestBackend(
      `/api/partners/me/client-requests/${encodeURIComponent(requestId)}`,
      { method: "GET" },
      { partnerId: guard.partnerId, traceId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const traceId = randomUUID();
  logPartnerIdentityTrace({
    traceId,
    requestPath: request.nextUrl.pathname,
    authUserId: guard.ctx.session?.user?.id || null,
    sessionPartnerId: guard.ctx.session?.user?.partnerId || null,
    resolvedPartnerId: guard.partnerId,
    forwardedPartnerId: guard.partnerId
  });
  const { requestId } = await context.params;
  try {
    const result = await callClientRequestBackend(
      `/api/partners/me/client-requests/${encodeURIComponent(requestId)}`,
      { method: "PATCH", body: await request.formData() },
      { partnerId: guard.partnerId, traceId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}
