import { NextResponse } from "next/server";
import { getAdminTenantPolicies, getBackendErrorBody, getBackendErrorStatus } from "@/lib/admin-client-policy";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  try {
    const result = await getAdminTenantPolicies();
    return noStore(NextResponse.json({ tenants: result.data.tenants || [] }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_clients_load_failed",
          detail: error instanceof Error ? error.message : "No se pudieron cargar los clientes."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
