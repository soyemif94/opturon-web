import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, getPortalWhatsAppEmbeddedSignupStatus } from "@/lib/api";
import { requireOpturonAdminApi } from "@/lib/saas/access";

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

  const { tenantId } = await params;
  if (!tenantId) {
    return noStore(NextResponse.json({ error: "missing_tenant_id" }, { status: 400 }));
  }

  try {
    const result = await getPortalWhatsAppEmbeddedSignupStatus(tenantId);
    return noStore(NextResponse.json(result));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_embedded_signup_status_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar la sesion de onboarding."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
