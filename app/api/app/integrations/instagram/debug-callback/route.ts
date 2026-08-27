import { NextRequest, NextResponse } from "next/server";
import { runPortalInstagramDirectExchangeDiagnostic, type InstagramDirectExchangeDiagnostic } from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DIAGNOSTIC_REVIEWER_TENANT_ID = "tenant_revisor_de_meta_msijugqq";

function renderResult(result: InstagramDirectExchangeDiagnostic) {
  const lines = [
    "INSTAGRAM_DIRECT_EXCHANGE_DIAGNOSTIC",
    `HTTP_STATUS=${result.httpStatus}`,
    `TOKEN_EXCHANGE=${result.tokenExchange}`,
    `USER_ID_PRESENT=${result.userIdPresent}`,
    `ACCESS_TOKEN_PRESENT=${result.accessTokenPresent}`
  ];
  if (result.tokenExchange === "FAIL") {
    lines.push(`PROVIDER_ERROR_TYPE=${result.providerErrorType || ""}`);
    lines.push(`PROVIDER_ERROR_CODE=${result.providerErrorCode || ""}`);
    lines.push(`PROVIDER_ERROR_MESSAGE=${result.providerErrorMessage || ""}`);
  }
  lines.push(
    `ROOT_CAUSE_BOUNDARY=${
      result.tokenExchange === "PASS"
        ? "OPTURON_NORMAL_EXCHANGE_IMPLEMENTATION"
        : "META_APP_OAUTH_CONFIGURATION_OR_PROVIDER"
    }`
  );
  return `${lines.join("\n")}\n`;
}

function plainResponse(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;
  if (auth.ctx.tenantId !== DIAGNOSTIC_REVIEWER_TENANT_ID) {
    return new NextResponse("INSTAGRAM_DIRECT_EXCHANGE_DIAGNOSTIC=FORBIDDEN\n", {
      status: 403,
      headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  const code = String(request.nextUrl.searchParams.get("code") || "");
  if (!code) {
    return plainResponse(renderResult({
      httpStatus: 0,
      tokenExchange: "FAIL",
      userIdPresent: false,
      accessTokenPresent: false,
      providerErrorType: "local_validation",
      providerErrorCode: null,
      providerErrorMessage: "missing_authorization_code"
    }));
  }

  try {
    const response = await runPortalInstagramDirectExchangeDiagnostic(code);
    return plainResponse(renderResult(response.data));
  } catch {
    return plainResponse(renderResult({
      httpStatus: 0,
      tokenExchange: "FAIL",
      userIdPresent: false,
      accessTokenPresent: false,
      providerErrorType: "internal_transport",
      providerErrorCode: null,
      providerErrorMessage: "diagnostic_transport_failed"
    }));
  }
}
