import { NextRequest, NextResponse } from "next/server";
import { finalizePortalWhatsAppEmbeddedSignup } from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

function buildPopupResponseHtml(payload: Record<string, unknown>) {
  const serialized = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Opturon | Conexion con Meta</title>
  </head>
  <body>
    <script>
      (function () {
        var payload = ${serialized};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, window.location.origin);
          }
        } catch (error) {}
        window.close();
      })();
    </script>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = String(url.searchParams.get("code") || "").trim() || null;
  const stateToken = String(url.searchParams.get("state") || "").trim() || null;
  const error = String(url.searchParams.get("error") || "").trim() || null;
  const errorDescription = String(url.searchParams.get("error_description") || "").trim() || null;

  return new NextResponse(
    buildPopupResponseHtml({
      type: "OPTURON_META_EMBEDDED_SIGNUP_CALLBACK",
      code,
      stateToken,
      error,
      errorDescription
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.json({ error: "missing_tenant_context" }, { status: 400 });
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

  const redirectUri = String(body?.redirectUri || new URL(request.url).toString()).trim();

  try {
    const result = await finalizePortalWhatsAppEmbeddedSignup(auth.ctx.tenantId, {
      stateToken: String(body?.stateToken || "").trim(),
      code: String(body?.code || "").trim() || null,
      redirectUri,
      requestId: String(body?.requestId || "").trim() || null,
      metaPayload: body?.metaPayload || null,
      error: body?.error || null,
      errorDescription: body?.errorDescription || null
    });

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error: unknown) {
    const detail =
      error && typeof error === "object" && "body" in error && (error as { body?: { error?: string; details?: string } }).body
        ? ((error as { body?: { error?: string; details?: string } }).body?.details ||
            (error as { body?: { error?: string; details?: string } }).body?.error ||
            (error instanceof Error ? error.message : "embedded_signup_finalize_failed"))
        : error instanceof Error
          ? error.message
          : "embedded_signup_finalize_failed";

    const status =
      error && typeof error === "object" && "status" in error && Number.isInteger(Number((error as { status?: number }).status))
        ? Number((error as { status?: number }).status)
        : 502;

    return NextResponse.json(
      {
        error: "embedded_signup_finalize_failed",
        detail
      },
      { status }
    );
  }
}
