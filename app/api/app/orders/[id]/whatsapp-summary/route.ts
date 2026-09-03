import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  isBackendConfigured,
  sendPortalOrderWhatsAppSummary
} from "@/lib/api";
import { requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const moduleGuard = await requireAppModuleApi("orders", { permission: "manage_workspace" });
  if (moduleGuard.error) return moduleGuard.error;
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return noStore(NextResponse.json({ error: "orders_backend_unavailable" }, { status: 503 }));

  const { id } = await params;
  try {
    const result = await sendPortalOrderWhatsAppSummary(tenantContext.tenantId, id);
    return noStore(NextResponse.json({ ok: true, summary: result.data }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(NextResponse.json(
      backendBody && typeof backendBody === "object"
        ? backendBody
        : { error: error instanceof Error ? error.message : "order_summary_send_failed" },
      { status: getBackendErrorStatus(error) || 502 }
    ));
  }
}
