import { NextRequest, NextResponse } from "next/server";
import {
  createPortalContact,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalContacts,
  isBackendConfigured
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "contacts_backend_unavailable" }, { status: 503 }));
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
    const result = await getPortalContacts(tenantContext.tenantId);
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        contacts: result.data.contacts || []
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
    const result = await createPortalContact(tenantContext.tenantId, {
      name: String(body?.name || "").trim(),
      email: body?.email || null,
      phone: body?.phone || null,
      whatsappPhone: body?.whatsappPhone || null,
      companyName: body?.companyName || null,
      taxId: body?.taxId || null,
      notes: body?.notes || null
    });

    return noStore(NextResponse.json({ ok: true, contact: result.data }, { status: 201 }));
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
