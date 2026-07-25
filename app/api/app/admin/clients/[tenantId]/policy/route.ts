import { NextRequest, NextResponse } from "next/server";
import {
  getAdminTenantPolicy,
  getBackendErrorBody,
  getBackendErrorStatus,
  patchAdminTenantPolicy
} from "@/lib/admin-client-policy";
import { requireOpturonAdminApi, resolveOpturonAdminActorId } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;
  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  if (!actorUserId) {
    return noStore(NextResponse.json({ error: "opturon_admin_actor_unavailable" }, { status: 403 }));
  }
  const { tenantId } = await params;

  try {
    const result = await getAdminTenantPolicy(tenantId, { actorUserId });
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_client_policy_load_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar la policy."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;
  const actorUserId = resolveOpturonAdminActorId(guard.ctx);
  if (!actorUserId) {
    return noStore(NextResponse.json({ error: "opturon_admin_actor_unavailable" }, { status: 403 }));
  }
  const { tenantId } = await params;
  const payload = await request.json().catch(() => ({}));

  try {
    const result = await patchAdminTenantPolicy(tenantId, payload || {}, { actorUserId });
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_client_policy_save_failed",
          detail: error instanceof Error ? error.message : "No se pudo guardar la policy."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
