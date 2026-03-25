import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalCashOverview,
  isBackendConfigured,
  openPortalCashSession
} from "@/lib/api";
import { requireAppApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "cash_backend_unavailable" }, { status: 503 }));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const result = await getPortalCashOverview(tenantContext.tenantId);
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        cashBoxes: result.data.cashBoxes || [],
        recentClosedSessions: result.data.recentClosedSessions || []
      })
    );
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAppApi({ permission: "edit_workspace" });
  if (guard.error) return guard.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const tenantId = String(guard.ctx?.tenantId || "").trim();
    const openedByUserId = String(guard.ctx?.userId || "").trim();
    const result = await openPortalCashSession(tenantId, {
      paymentDestinationId: String(body?.paymentDestinationId || ""),
      openingAmount: Number(body?.openingAmount || 0),
      openedByUserId,
      notes: typeof body?.notes === "string" ? body.notes : null
    });

    return noStore(NextResponse.json({ ok: true, session: result.data }, { status: 201 }));
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
