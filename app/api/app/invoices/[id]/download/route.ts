import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "invoices_backend_unavailable" }, { status: 503 }));
}

function getApiBase() {
  return String(process.env.BACKEND_BASE_URL || process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://opturon-api.onrender.com")
    .trim()
    .replace(/\/$/, "");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const upstreamUrl = new URL(`${getApiBase()}/portal/tenants/${tenantContext.tenantId}/invoices/${id}/download`);
    const format = String(url.searchParams.get("format") || "").trim();
    if (format) upstreamUrl.searchParams.set("format", format);

    const response = await fetch(upstreamUrl, {
      headers: {
        "x-portal-key": String(process.env.PORTAL_INTERNAL_KEY || "").trim()
      },
      cache: "no-store"
    });

    const body = await response.text();
    if (!response.ok) {
      let parsedBody: unknown = null;
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = { error: body || "backend_invoice_download_failed" };
      }
      return noStore(
        NextResponse.json(
          parsedBody && typeof parsedBody === "object" ? parsedBody : { error: "backend_invoice_download_failed" },
          { status: response.status }
        )
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": response.headers.get("content-disposition") || `attachment; filename="${id}.json"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_invoice_download_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
