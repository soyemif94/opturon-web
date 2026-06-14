import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus } from "@/lib/api";
import { getAdminMetaEmbeddedSignupReadiness, type MetaEmbeddedSignupReadiness } from "@/lib/admin-client-policy";
import { resolveMetaEmbeddedSignupConfig } from "@/lib/meta-embedded-signup-config";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function mergeFrontendLaunchPayload(readiness: MetaEmbeddedSignupReadiness): MetaEmbeddedSignupReadiness {
  const runtimeConfig = resolveMetaEmbeddedSignupConfig();
  const checks = {
    ...readiness.checks,
    frontendLaunchPayload: {
      kind: "automatic" as const,
      configured: runtimeConfig.ready,
      safe: true,
      deliveryMode: "server_side_payload",
      missingConfig: runtimeConfig.missingConfig,
      fields: runtimeConfig.payloadFields,
      blocking: !runtimeConfig.ready
    }
  };
  const blockingChecks = Object.entries(checks)
    .filter(([, check]) => check.kind === "automatic" && check.blocking === true)
    .map(([key]) => key);
  const automaticChecksTotal = Object.values(checks).filter((check) => check.kind === "automatic").length;
  const automaticChecksReady = automaticChecksTotal - blockingChecks.length;
  const readyForTest = blockingChecks.length === 0;

  return {
    ...readiness,
    checks,
    blockingChecks,
    automaticChecksReady,
    automaticChecksTotal,
    readyForTest,
    status: readyForTest ? "ready_for_test" : "configuration_incomplete"
  };
}

export async function GET(_request: NextRequest) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  try {
    const result = await getAdminMetaEmbeddedSignupReadiness();
    return noStore(NextResponse.json({ ...result, data: mergeFrontendLaunchPayload(result.data) }));
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
