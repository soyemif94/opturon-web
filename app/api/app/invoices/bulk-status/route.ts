import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, updatePortalInvoicesBulkStatus } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "invoices_backend_unavailable" }, { status: 503 }));
}

export async function PATCH(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await updatePortalInvoicesBulkStatus(tenantContext.tenantId, {
      invoiceIds: Array.isArray(body?.invoiceIds) ? body.invoiceIds : [],
      fiscalStatus: String(body?.fiscalStatus || "")
    });

    return noStore(NextResponse.json({ ok: true, invoices: result.data.invoices, fiscalStatus: result.data.fiscalStatus }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_bulk_status_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
