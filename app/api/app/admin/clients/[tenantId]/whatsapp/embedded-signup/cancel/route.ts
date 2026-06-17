import { NextRequest, NextResponse } from "next/server";
import {
  cancelPortalWhatsAppEmbeddedSignupSession,
  getBackendErrorBody,
  getBackendErrorStatus
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
        source?: string;
      }
    | null;

  try {
    const result = await cancelPortalWhatsAppEmbeddedSignupSession(tenantId, {
      actorUserId: guard.ctx.userId,
      source: String(body?.source || "").trim() || "opturon_admin_cancel"
    });
    return noStore(NextResponse.json({ success: true, data: result.data }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_embedded_signup_cancel_failed",
          detail: error instanceof Error ? error.message : "No pudimos cancelar la sesion de onboarding."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
