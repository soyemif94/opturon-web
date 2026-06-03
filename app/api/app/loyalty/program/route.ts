import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalLoyaltyProgram,
  isBackendConfigured,
  patchPortalLoyaltyProgram
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "loyalty_backend_unavailable" }, { status: 503 }));
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
    const result = await getPortalLoyaltyProgram(tenantContext.tenantId);
    return noStore(NextResponse.json({ tenantId: tenantContext.tenantId, program: result.data.program }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_fetch_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function PATCH(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true, permission: "edit_workspace" });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await patchPortalLoyaltyProgram(tenantContext.tenantId, {
      enabled: body?.enabled === true,
      spendAmount: Number(body?.spendAmount || 0),
      pointsAmount: Number(body?.pointsAmount || 0),
      programText: typeof body?.programText === "string" ? body.programText : undefined,
      redemptionPolicyText: typeof body?.redemptionPolicyText === "string" ? body.redemptionPolicyText : undefined
    });

    return noStore(NextResponse.json({ ok: true, program: result.data.program }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_update_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
