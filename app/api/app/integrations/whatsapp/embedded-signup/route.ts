import { NextRequest, NextResponse } from "next/server";
import {
  createPortalWhatsAppEmbeddedSignupBootstrap,
  getPortalWhatsAppEmbeddedSignupStatus,
  getPortalTenantContext,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";
import { buildWhatsAppConnectionStatus } from "@/lib/whatsapp-channel-state";

function resolveMetaEmbeddedSignupConfig() {
  const appId = String(
    process.env.NEXT_PUBLIC_META_APP_ID ||
      process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_APP_ID ||
      process.env.WHATSAPP_APP_ID ||
      ""
  ).trim();
  const configId = String(
    process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ||
      process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID ||
      ""
  ).trim();

  return {
    ready: Boolean(appId && configId),
    appId: appId || null,
    configId: configId || null,
    graphVersion: String(process.env.NEXT_PUBLIC_WHATSAPP_GRAPH_VERSION || process.env.WHATSAPP_GRAPH_VERSION || "v25.0").trim(),
    callbackPath: "/api/app/integrations/whatsapp/embedded-signup/callback"
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json(
      {
        error: "backend_not_configured",
        detail: "No hay backend persistente configurado para iniciar la conexion de WhatsApp."
      },
      { status: 503 }
    );
  }

  const embeddedSignup = resolveMetaEmbeddedSignupConfig();
  const redirectUri = new URL(embeddedSignup.callbackPath, request.nextUrl.origin).toString();

  if (!embeddedSignup.ready) {
    return NextResponse.json(
      {
        success: true,
        data: {
          tenantId: auth.ctx.tenantId,
          clinicId: auth.ctx.tenantId,
          state: "pending_meta",
          provider: "meta_embedded_signup",
          ready: false,
          appId: embeddedSignup.appId,
          configId: embeddedSignup.configId,
          graphVersion: embeddedSignup.graphVersion,
          redirectUri,
          callbackPath: embeddedSignup.callbackPath,
          message: "Estamos preparando la conexion automatica con Meta para este workspace."
        }
      },
      { status: 202 }
    );
  }

  try {
    const bootstrap = await createPortalWhatsAppEmbeddedSignupBootstrap(auth.ctx.tenantId, {
      redirectUri,
      actorUserId: auth.ctx.userId,
      metadata: null
    });
    const tenantContext = await getPortalTenantContext(auth.ctx.tenantId).catch(() => null);
    const onboarding = await getPortalWhatsAppEmbeddedSignupStatus(auth.ctx.tenantId).catch(() => null);
    const status = buildWhatsAppConnectionStatus({
      context: tenantContext?.data || null,
      onboarding: onboarding?.data || null,
      fallbackReason: tenantContext ? null : "portal_tenant_context_failed"
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          tenantId: auth.ctx.tenantId,
          clinicId: bootstrap.data.clinicId,
          state: status.state === "connected" ? "connected" : "launching",
          provider: "meta_embedded_signup",
          ready: bootstrap.data.ready,
          appId: embeddedSignup.appId,
          configId: embeddedSignup.configId,
          graphVersion: embeddedSignup.graphVersion,
          redirectUri,
          callbackPath: embeddedSignup.callbackPath,
          stateToken: bootstrap.data.session?.stateToken || null,
          sessionId: bootstrap.data.session?.id || null,
          message:
            status.state === "connected"
              ? "El canal ya esta conectado para este workspace."
              : "Abrimos el flujo real de Meta para conectar este workspace sin pedir datos tecnicos manuales."
        }
      },
      { status: bootstrap.data.ready ? 200 : 202 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "embedded_signup_bootstrap_failed",
        detail: error instanceof Error ? error.message : "No pudimos preparar la conexion con Meta."
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
  }

  if (!isBackendConfigured()) {
    const status = buildWhatsAppConnectionStatus({ fallbackReason: "backend_not_configured" });
    return NextResponse.json({ success: true, data: status });
  }

  try {
    const [contextResult, onboardingResult] = await Promise.all([
      getPortalTenantContext(auth.ctx.tenantId),
      getPortalWhatsAppEmbeddedSignupStatus(auth.ctx.tenantId)
    ]);
    const status = buildWhatsAppConnectionStatus({
      context: contextResult.data,
      onboarding: onboardingResult.data
    });
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    const status = buildWhatsAppConnectionStatus({
      fallbackReason: error instanceof Error ? error.message : "portal_tenant_context_failed"
    });
    return NextResponse.json({ success: true, data: status });
  }
}
