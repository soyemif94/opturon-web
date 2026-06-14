import { NextRequest, NextResponse } from "next/server";
import { createPortalWhatsAppEmbeddedSignupBootstrap, getBackendErrorBody, getBackendErrorStatus } from "@/lib/api";
import { resolveMetaEmbeddedSignupConfig } from "@/lib/meta-embedded-signup-config";
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

  const embeddedSignup = resolveMetaEmbeddedSignupConfig();
  const redirectUri = new URL(embeddedSignup.callbackPath, request.nextUrl.origin).toString();

  try {
    const bootstrap = await createPortalWhatsAppEmbeddedSignupBootstrap(tenantId, {
      redirectUri,
      actorUserId: guard.ctx.userId,
      metadata: {
        launchSurface: "opturon_admin_client_management",
        controlledTest: true
      }
    });

    return noStore(
      NextResponse.json({
        success: true,
        data: {
          tenantId,
          clinicId: bootstrap.data.clinicId,
          state: "launching",
          provider: "meta_embedded_signup",
          ready: bootstrap.data.ready,
          appId: embeddedSignup.appId,
          configId: embeddedSignup.configId,
          missingConfig: embeddedSignup.missingConfig,
          graphVersion: embeddedSignup.graphVersion,
          redirectUri,
          callbackPath: embeddedSignup.callbackPath,
          stateToken: bootstrap.data.session?.stateToken || null,
          sessionId: bootstrap.data.session?.id || null,
          message: "Abrimos el flujo real de Meta para conectar el tenant seleccionado sin pedir IDs ni tokens manuales."
        }
      })
    );
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_embedded_signup_bootstrap_failed",
          detail: error instanceof Error ? error.message : "No pudimos preparar la conexion con Meta."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
