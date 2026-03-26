import { NextRequest, NextResponse } from "next/server";
import {
  createPortalProductCategory,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalProductCategories,
  isBackendConfigured,
  type PortalProductCategory
} from "@/lib/api";
import { resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function serializeCategory(category: PortalProductCategory) {
  return {
    ...category
  };
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "catalog_backend_unavailable" }, { status: 503 }));
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
    const result = await getPortalProductCategories(tenantContext.tenantId, {
      includeInactive: url.searchParams.get("includeInactive") === "true"
    });
    const categories = Array.isArray(result.data?.categories) ? result.data.categories.map(serializeCategory) : [];
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        categories
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
  const tenantContext = await resolveAppTenant({ permission: "manage_catalog", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await createPortalProductCategory(tenantContext.tenantId, {
      name: String(body?.name || "").trim(),
      isActive: body?.isActive !== false
    });

    return noStore(NextResponse.json({ ok: true, category: serializeCategory(result.data) }, { status: 201 }));
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
