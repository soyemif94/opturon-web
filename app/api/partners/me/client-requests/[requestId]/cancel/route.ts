import { NextResponse } from "next/server";
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

export async function POST(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return noStore(guard.error);
  const { requestId } = await context.params;
  try {
    const result = await callClientRequestBackend(
      `/api/partners/me/client-requests/${encodeURIComponent(requestId)}/cancel`,
      { method: "POST", body: "{}" },
      { partnerId: guard.partnerId }
    );
    return noStore(NextResponse.json(result));
  } catch (error) {
    return noStore(NextResponse.json(getClientRequestBackendErrorBody(error) || { error: "cancel_failed" }, { status: getClientRequestBackendErrorStatus(error) || 502 }));
  }
}
