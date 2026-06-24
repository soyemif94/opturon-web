import { NextResponse } from "next/server";
import {
  fetchClientRequestReceipt,
  getClientRequestBackendErrorBody,
  getClientRequestBackendErrorStatus
} from "@/lib/partner-client-requests-api";
import { requireOpturonAdminApi, resolveOpturonAdminActorId } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, context: { params: Promise<{ requestId: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;
  const actorId = resolveOpturonAdminActorId(guard.ctx);
  if (!actorId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { requestId } = await context.params;
  try {
    const backend = await fetchClientRequestReceipt(
      `/api/admin/partners/client-requests/${encodeURIComponent(requestId)}/receipt`,
      { adminActorId: actorId }
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
