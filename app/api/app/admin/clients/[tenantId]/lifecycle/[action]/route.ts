import { NextRequest, NextResponse } from "next/server";
import { postAdminClientLifecycleAction, getBackendErrorBody, getBackendErrorStatus } from "@/lib/admin-client-policy";
import { requireOpturonAdminApi, resolveOpturonAdminActorId } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string; action: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;
  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  if (!actorUserId) return noStore(NextResponse.json({ error: "opturon_admin_actor_unavailable" }, { status: 403 }));
  const { tenantId, action: rawAction } = await params;
  if (rawAction !== "suspend" && rawAction !== "reactivate") {
    return noStore(NextResponse.json({ error: "invalid_lifecycle_action" }, { status: 400 }));
  }
  const payload = await request.json().catch(() => ({}));
  const reason = String(payload?.reason || "").trim();
  if (!reason) return noStore(NextResponse.json({ error: "tenant_lifecycle_reason_required" }, { status: 400 }));
  try {
    const result = await postAdminClientLifecycleAction(tenantId, rawAction, reason, { actorUserId });
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(NextResponse.json(getBackendErrorBody(error) || {
      error: error instanceof Error ? error.message : "client_lifecycle_action_failed"
    }, { status: getBackendErrorStatus(error) || 502 }));
  }
}
