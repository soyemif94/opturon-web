import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  refreshPortalWhatsAppEmbeddedSignupStatus
} from "@/lib/api";
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
        reason?: string;
        source?: string;
      }
    | null;

  try {
    const result = await refreshPortalWhatsAppEmbeddedSignupStatus(tenantId, {
      actorUserId: guard.ctx.userId,
      reason: String(body?.reason || "").trim() || "manual_refresh",
      source: String(body?.source || "").trim() || "opturon_admin_refresh"
    });
    return noStore(NextResponse.json({ success: true, data: result.data }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_embedded_signup_refresh_failed",
          detail: error instanceof Error ? error.message : "No pudimos refrescar la sesion de onboarding."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
