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

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const response = await fetch(`${getApiBase()}/portal/tenants/${tenantContext.tenantId}/invoices/bulk-download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-portal-key": String(process.env.PORTAL_INTERNAL_KEY || "").trim()
      },
      body: JSON.stringify({
        invoiceIds: Array.isArray(body?.invoiceIds) ? body.invoiceIds : []
      }),
      cache: "no-store"
    });

    const text = await response.text();
    if (!response.ok) {
      let parsedBody: unknown = null;
      try {
        parsedBody = JSON.parse(text);
      } catch {
        parsedBody = { error: text || "backend_invoice_bulk_download_failed" };
      }
      return noStore(
        NextResponse.json(
          parsedBody && typeof parsedBody === "object" ? parsedBody : { error: "backend_invoice_bulk_download_failed" },
          { status: response.status }
        )
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "text/html; charset=utf-8",
        "Content-Disposition": response.headers.get("content-disposition") || 'attachment; filename="opturon-comprobantes-lote.html"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_invoice_bulk_download_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
