import { NextRequest, NextResponse } from "next/server";
import {
  closePortalCashSession,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalAuthUserByEmail,
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
    const actorEmail = String(guard.ctx?.session?.user?.email || "").trim().toLowerCase();
    if (!actorEmail) {
      return noStore(NextResponse.json({ error: "cash_close_actor_email_missing" }, { status: 401 }));
    }
    const actorLookup = await getPortalAuthUserByEmail(actorEmail);
    const actorUser = actorLookup.data;
    if (!actorUser || String(actorUser.tenantId || "").trim() !== tenantId) {
      return noStore(NextResponse.json({ error: "cash_close_actor_not_allowed" }, { status: 403 }));
    }
    const closedByUserId = String(actorUser.id || "").trim();
    const result = await closePortalCashSession(tenantId, id, {
      countedAmount: Number(body?.countedAmount || 0),
      closedByUserId,
      notes: typeof body?.notes === "string" ? body.notes : null
    }, closedByUserId);

    return noStore(NextResponse.json({ ok: true, session: result.data }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_update_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
