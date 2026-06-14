import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus } from "@/lib/api";
import { getAdminMetaEmbeddedSignupReadiness } from "@/lib/admin-client-policy";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_request: NextRequest) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  try {
    const result = await getAdminMetaEmbeddedSignupReadiness();
    return noStore(NextResponse.json(result));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_meta_embedded_signup_readiness_failed",
          detail:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el diagnostico de preparacion Meta."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
