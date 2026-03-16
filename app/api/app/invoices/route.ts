import { NextRequest, NextResponse } from "next/server";
import { createPortalInvoice, getBackendErrorBody, getBackendErrorStatus, getPortalInvoices, isBackendConfigured } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "invoices_backend_unavailable" }, { status: 503 }));
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
    const result = await getPortalInvoices(tenantContext.tenantId);
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        invoices: result.data.invoices || []
      })
    );
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_fetch_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await createPortalInvoice(tenantContext.tenantId, {
      contactId: body?.contactId || null,
      type: body?.type || "invoice",
      parentInvoiceId: body?.parentInvoiceId || null,
      documentMode: body?.documentMode || "internal_only",
      currency: body?.currency || "ARS",
      metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
      items: Array.isArray(body?.items) ? body.items : []
    });

    return noStore(NextResponse.json({ ok: true, invoice: result.data }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : {
              error: error instanceof Error ? error.message : "backend_create_failed"
            },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
