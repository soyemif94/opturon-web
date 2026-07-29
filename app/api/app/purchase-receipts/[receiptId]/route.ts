import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalPurchaseReceiptDetail,
  isBackendConfigured
} from "@/lib/api";
import { requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "purchase_receipts_backend_unavailable" }, { status: 503 }));
}

export async function GET(_request: NextRequest, context: { params: Promise<{ receiptId: string }> }) {
  const moduleGuard = await requireAppModuleApi("inventory");
  if (moduleGuard.error) return moduleGuard.error;
  const tenantContext = await resolveAppTenant();
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const { receiptId } = await context.params;
    const result = await getPortalPurchaseReceiptDetail(tenantContext.tenantId, receiptId);
    return noStore(NextResponse.json({ readOnly: tenantContext.readOnly, receipt: result.data }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
