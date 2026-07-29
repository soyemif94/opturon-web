import { NextRequest, NextResponse } from "next/server";
import {
  createPortalSupplier,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalSuppliers,
  isBackendConfigured
} from "@/lib/api";
import { requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "suppliers_backend_unavailable" }, { status: 503 }));
}

function actorFromTenantContext(tenantContext: Awaited<ReturnType<typeof resolveAppTenant>>) {
  return {
    id: tenantContext.ctx?.portalActorId || tenantContext.ctx?.userId || null,
    name: tenantContext.ctx?.session?.user?.name || null
  };
}

async function requireSuppliersReadModuleApi() {
  const inventoryGuard = await requireAppModuleApi("inventory");
  if (!inventoryGuard.error) return inventoryGuard;
  return requireAppModuleApi("catalog");
}

export async function GET(request: NextRequest) {
  const moduleGuard = await requireSuppliersReadModuleApi();
  if (moduleGuard.error) return moduleGuard.error;
  const url = new URL(request.url);
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const result = await getPortalSuppliers(tenantContext.tenantId, {
      search: url.searchParams.get("search") || undefined,
      status: (url.searchParams.get("status") as "active" | "inactive" | "all" | null) || undefined,
      page: Number(url.searchParams.get("page") || 1),
      pageSize: Number(url.searchParams.get("pageSize") || 20),
      sort: (url.searchParams.get("sort") as "name_asc" | "name_desc" | "updated_asc" | "updated_desc" | null) || undefined
    });
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        items: Array.isArray(result.data?.items) ? result.data.items : [],
        pagination: result.data?.pagination || null,
        filters: result.data?.filters || null,
        summary: result.data?.summary || null
      })
    );
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_fetch_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  const moduleGuard = await requireAppModuleApi("inventory", { permission: "manage_inventory_receipts" });
  if (moduleGuard.error) return moduleGuard.error;
  const tenantContext = await resolveAppTenant({ permission: "manage_inventory_receipts", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await createPortalSupplier(
      tenantContext.tenantId,
      {
        legalName: String(body?.legalName || "").trim(),
        tradeName: body?.tradeName || null,
        taxId: body?.taxId || null,
        email: body?.email || null,
        phone: body?.phone || null,
        address: body?.address || null,
        notes: body?.notes || null
      },
      actorFromTenantContext(tenantContext)
    );
    return noStore(NextResponse.json({ ok: true, supplier: result.data }, { status: 201 }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object" ? backendBody : { error: error instanceof Error ? error.message : "backend_create_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
