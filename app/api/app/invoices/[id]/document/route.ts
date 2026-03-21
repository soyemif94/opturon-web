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
    const upstream = await fetch(`${getApiBase()}/portal/tenants/${tenantContext.tenantId}/invoices/${id}/document`, {
      headers: {
        "x-portal-key": String(process.env.PORTAL_INTERNAL_KEY || "").trim()
      },
      cache: "no-store"
    });
    const html = await upstream.text();
    if (!upstream.ok) {
      let body: unknown = null;
      try {
        body = JSON.parse(html);
      } catch {
        body = { error: html || "backend_document_failed" };
      }
      return noStore(
        NextResponse.json(
          typeof body === "object" && body ? body : { error: "backend_document_failed" },
          { status: upstream.status }
        )
      );
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": upstream.headers.get("content-disposition") || 'attachment; filename="documento-interno.html"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_document_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
