import { NextRequest, NextResponse } from "next/server";
import { getPortalTenantPolicy, patchPortalTenantPolicy } from "@/lib/api";
import { requireOpturonAdminApi, resolveOpturonAdminActorId } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const auth = await requireOpturonAdminApi();
  if (auth.error) return auth.error;
  if (!auth.ctx.tenantId) return noStore(NextResponse.json({ error: "missing_tenant_context" }, { status: 400 }));
  const actorUserId = resolveOpturonAdminActorId(auth.ctx);
  if (!actorUserId) return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

  try {
    const result = await getPortalTenantPolicy(auth.ctx.tenantId, { actorUserId });
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    console.error("[operating-profile][GET] Backend request failed", error);
    return noStore(NextResponse.json({ error: "tenant_policy_load_failed" }, { status: 502 }));
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOpturonAdminApi();
  if (auth.error) return auth.error;
  if (!auth.ctx.tenantId) return noStore(NextResponse.json({ error: "missing_tenant_context" }, { status: 400 }));
  const actorUserId = resolveOpturonAdminActorId(auth.ctx);
  if (!actorUserId) return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

  try {
    const payload = await request.json().catch(() => ({}));
    const result = await patchPortalTenantPolicy(auth.ctx.tenantId, payload || {}, {
      actorUserId
    });
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    console.error("[operating-profile][PATCH] Backend request failed", error);
    return noStore(NextResponse.json({ error: "tenant_policy_save_failed" }, { status: 502 }));
  }
}
