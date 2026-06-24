import { NextResponse } from "next/server";
import {
  fetchClientRequestReceipt,
  getClientRequestBackendErrorBody,
  getClientRequestBackendErrorStatus
} from "@/lib/partner-client-requests-api";
import { requirePartnerApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requirePartnerApi();
  if (guard.error) return guard.error;
  const { requestId } = await context.params;
  try {
    const backend = await fetchClientRequestReceipt(
      `/api/partners/me/client-requests/${encodeURIComponent(requestId)}/receipt`,
      { partnerId: String(guard.ctx.session?.user?.partnerId || "") }
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
