import { NextRequest, NextResponse } from "next/server";
import { getBackendErrorBody, getBackendErrorStatus, isBackendConfigured, restorePortalContacts } from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function PATCH(request: NextRequest) {
  const tenantContext = await resolveAppTenant({ requireWrite: true });
  if (tenantContext.error) return tenantContext.error;

  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "contacts_backend_unavailable" }, { status: 503 }));
  }

  try {
    const body = await request.json().catch(() => null);
    const contactIds = Array.isArray(body?.contactIds) ? body.contactIds : [];
    const result = await restorePortalContacts(tenantContext.tenantId, contactIds);
    return noStore(NextResponse.json({ ok: true, ...result.data }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "contacts_restore_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
