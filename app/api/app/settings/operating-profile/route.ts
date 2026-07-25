import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPortalTenantPolicy, patchPortalTenantPolicy } from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;
  if (!auth.ctx.tenantId) return noStore(NextResponse.json({ error: "missing_tenant_context" }, { status: 400 }));

  try {
    const result = await getPortalTenantPolicy(auth.ctx.tenantId);
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "tenant_policy_load_failed",
          detail: error instanceof Error ? error.message : "unknown_error"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;
  if (!auth.ctx.tenantId) return noStore(NextResponse.json({ error: "missing_tenant_context" }, { status: 400 }));

  try {
    const payload = await request.json().catch(() => ({}));
    const result = await patchPortalTenantPolicy(auth.ctx.tenantId, payload || {}, {
      actorUserId: auth.ctx.portalActorId || auth.ctx.userId || null
    });
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "tenant_policy_save_failed",
          detail: error instanceof Error ? error.message : "unknown_error"
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
