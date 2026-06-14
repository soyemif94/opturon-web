import { NextRequest, NextResponse } from "next/server";
import { finalizePortalWhatsAppEmbeddedSignup, getBackendErrorBody, getBackendErrorStatus } from "@/lib/api";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  const { tenantId } = await params;
  if (!tenantId) {
    return noStore(NextResponse.json({ error: "missing_tenant_id" }, { status: 400 }));
  }

  const body = (await request.json().catch(() => null)) as
    | {
        stateToken?: string;
        code?: string;
        redirectUri?: string;
        requestId?: string;
        metaPayload?: Record<string, unknown> | null;
        error?: string | null;
        errorDescription?: string | null;
      }
    | null;

  try {
    const result = await finalizePortalWhatsAppEmbeddedSignup(tenantId, {
      stateToken: String(body?.stateToken || "").trim(),
      code: String(body?.code || "").trim() || null,
      redirectUri: String(body?.redirectUri || "").trim(),
      requestId: String(body?.requestId || "").trim() || null,
      metaPayload: body?.metaPayload || null,
      error: body?.error || null,
      errorDescription: body?.errorDescription || null
    });

    return noStore(NextResponse.json({ success: true, data: result.data }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_embedded_signup_finalize_failed",
          detail: error instanceof Error ? error.message : "No pudimos finalizar la conexion con Meta."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
