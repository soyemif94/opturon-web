import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, redeemPortalLoyaltyReward } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "loyalty_backend_unavailable" }, { status: 503 }));
}

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true, permission: "edit_workspace" });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await redeemPortalLoyaltyReward(tenantContext.tenantId, {
      contactId: String(body?.contactId || "").trim(),
      rewardId: String(body?.rewardId || "").trim(),
      notes: typeof body?.notes === "string" ? body.notes : null
    });

    return noStore(NextResponse.json({ ok: true, ...result.data }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_create_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
