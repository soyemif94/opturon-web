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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const upstreamUrl = new URL(`${getApiBase()}/portal/tenants/${tenantContext.tenantId}/invoices/export.csv`);
    ["fiscalStatus", "contactId", "dateFrom", "dateTo", "search", "documentKind", "deliveredFilter", "incompleteOnly"].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) upstreamUrl.searchParams.set(key, value);
    });

    const response = await fetch(upstreamUrl, {
      headers: {
        "x-portal-key": String(process.env.PORTAL_INTERNAL_KEY || "").trim()
      },
      cache: "no-store"
    });

    const contentType = response.headers.get("content-type") || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const contentDisposition = response.headers.get("content-disposition") || 'attachment; filename="opturon-comprobantes.xlsx"';
    const body = Buffer.from(await response.arrayBuffer());
    if (!response.ok) {
      let errorBody: unknown = null;
      try {
        errorBody = JSON.parse(body.toString("utf8"));
      } catch {
        errorBody = { error: body.toString("utf8") || "backend_export_failed" };
      }
      return noStore(
        NextResponse.json(
          typeof errorBody === "object" && errorBody ? errorBody : { error: "backend_export_failed" },
          { status: response.status }
        )
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_export_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
