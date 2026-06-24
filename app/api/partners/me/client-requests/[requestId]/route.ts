import { NextRequest, NextResponse } from "next/server";
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

export async function GET(_request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const { requestId } = await context.params;
  try {
    const result = await callClientRequestBackend(
      `/api/partners/me/client-requests/${encodeURIComponent(requestId)}`,
      { method: "GET" },
      { partnerId: guard.partnerId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const { requestId } = await context.params;
  try {
    const result = await callClientRequestBackend(
      `/api/partners/me/client-requests/${encodeURIComponent(requestId)}`,
      { method: "PATCH", body: await request.formData() },
      { partnerId: guard.partnerId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return errorResponse(error);
  }
}
