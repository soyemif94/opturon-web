import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, updatePortalInvoiceAccounting } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "invoices_backend_unavailable" }, { status: 503 }));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await updatePortalInvoiceAccounting(tenantContext.tenantId, id, {
      documentKind: body?.documentKind,
      fiscalStatus: body?.fiscalStatus,
      customerTaxId: body?.customerTaxId || null,
      customerTaxIdType: body?.customerTaxIdType,
      customerLegalName: body?.customerLegalName || null,
      customerVatCondition: body?.customerVatCondition || null,
      issuerLegalName: body?.issuerLegalName || null,
      issuerTaxId: body?.issuerTaxId || null,
      issuerVatCondition: body?.issuerVatCondition || null,
      suggestedFiscalVoucherType: body?.suggestedFiscalVoucherType,
      accountantNotes: body?.accountantNotes || null,
      accountantReferenceNumber: body?.accountantReferenceNumber || null
    });

    return noStore(NextResponse.json({ ok: true, invoice: result.data }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_update_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
