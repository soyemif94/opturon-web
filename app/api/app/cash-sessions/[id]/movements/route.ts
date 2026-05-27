import { NextRequest, NextResponse } from "next/server";
import {
  createPortalCashSessionMovement,
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "cash_backend_unavailable" }, { status: 503 }));
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAppApi({ permission: "edit_workspace" });
  if (guard.error) return guard.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const tenantId = String(guard.ctx?.tenantId || "").trim();
    const createdByUserId = String(guard.ctx?.userId || "").trim();
    if (!tenantId || !createdByUserId) {
      return noStore(NextResponse.json({ error: "cash_movement_actor_not_allowed" }, { status: 403 }));
    }

    const result = await createPortalCashSessionMovement(
      tenantId,
      id,
      {
        type: body?.type === "manual_out" ? "manual_out" : "manual_in",
        amount: Number(body?.amount || 0),
        method: typeof body?.method === "string" ? body.method : "cash",
        reason: typeof body?.reason === "string" ? body.reason : null,
        createdByUserId,
        actorName: typeof guard.ctx?.session?.user?.name === "string" ? guard.ctx.session.user.name : "",
        actorEmail: typeof guard.ctx?.session?.user?.email === "string" ? guard.ctx.session.user.email : "",
        actorGlobalRole: typeof guard.ctx?.globalRole === "string" ? guard.ctx.globalRole : "",
        actorTenantRole: typeof guard.ctx?.tenantRole === "string" ? guard.ctx.tenantRole : ""
      },
      createdByUserId
    );

    return noStore(NextResponse.json({ ok: true, movement: result.data.movement, session: result.data.session }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_create_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
