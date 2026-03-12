import { NextResponse } from "next/server";
import { getPortalTenantContext, isBackendConfigured } from "@/lib/api";
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
    callbackPath: "/api/app/integrations/whatsapp/embedded-signup/callback"
  };
}

export async function POST() {
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

  const tenantContext = await getPortalTenantContext(auth.ctx.tenantId).catch(() => null);
  const status = buildWhatsAppConnectionStatus({
    context: tenantContext?.data || null,
    fallbackReason: tenantContext ? null : "portal_tenant_context_failed"
  });
  const embeddedSignup = resolveMetaEmbeddedSignupConfig();

  if (!embeddedSignup.ready) {
    return NextResponse.json(
      {
        success: true,
        data: {
          tenantId: auth.ctx.tenantId,
          clinicId: status.clinicId,
          state: "pending_meta",
          provider: "meta_embedded_signup",
          ready: false,
          appId: embeddedSignup.appId,
          configId: embeddedSignup.configId,
          callbackPath: embeddedSignup.callbackPath,
          message: "Estamos preparando la conexion automatica con Meta para este workspace."
        }
      },
      { status: 202 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      tenantId: auth.ctx.tenantId,
      clinicId: status.clinicId,
      state: status.state === "connected" ? "connected" : "pending_meta",
      provider: "meta_embedded_signup",
      ready: true,
      appId: embeddedSignup.appId,
      configId: embeddedSignup.configId,
      callbackPath: embeddedSignup.callbackPath,
      message:
        status.state === "connected"
          ? "El canal ya esta conectado para este workspace."
          : "La base tecnica para Embedded Signup ya esta lista. El siguiente paso es lanzar el flujo de Meta desde el cliente."
    }
  });
}
