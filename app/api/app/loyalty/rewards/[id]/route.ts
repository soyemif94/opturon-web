import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, patchPortalLoyaltyReward } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "loyalty_backend_unavailable" }, { status: 503 }));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantContext = await resolveAppTenant({ requireWrite: true, permission: "edit_workspace" });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await patchPortalLoyaltyReward(tenantContext.tenantId, id, {
      name: typeof body?.name === "string" ? body.name : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      pointsCost: body?.pointsCost !== undefined ? Number(body.pointsCost) : undefined,
      stockQty: body?.stockQty !== undefined ? Number(body.stockQty) : undefined,
      image:
        body?.image === null
          ? null
          : body?.image && typeof body.image === "object" && typeof body.image.url === "string"
            ? {
                url: body.image.url,
                alt: typeof body.image.alt === "string" ? body.image.alt : null,
                source: typeof body.image.source === "string" ? body.image.source : null
              }
            : undefined,
      active: body?.active !== undefined ? body.active === true : undefined
    });

    return noStore(NextResponse.json({ ok: true, reward: result.data.reward }));
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
