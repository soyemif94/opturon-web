import { NextRequest, NextResponse } from "next/server";
import {
  createPortalPurchaseReceipt,
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalPurchaseReceipts,
  isBackendConfigured
} from "@/lib/api";
import { getPortalInventoryReadActor, requireAppModuleApi, resolveAppTenant } from "@/lib/saas/access";
import { parsePurchaseReceiptsListQuery } from "./query";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function backendUnavailable() {
  return noStore(NextResponse.json({ error: "purchase_receipts_backend_unavailable" }, { status: 503 }));
}

function actorFromTenantContext(tenantContext: Awaited<ReturnType<typeof resolveAppTenant>>) {
  if (!("ctx" in tenantContext) || !tenantContext.ctx) return {};
  return getPortalInventoryReadActor(tenantContext.ctx);
}

export async function GET(request: NextRequest) {
  const moduleGuard = await requireAppModuleApi("inventory");
  if (moduleGuard.error) return moduleGuard.error;
  const url = new URL(request.url);
  const parsedQuery = parsePurchaseReceiptsListQuery(url.searchParams);
  if (!parsedQuery.ok) {
    return noStore(NextResponse.json({ error: parsedQuery.error }, { status: 400 }));
  }
  const tenantContext = await resolveAppTenant({
    requestedTenantId: url.searchParams.get("tenantId") || undefined,
    demo: url.searchParams.get("demo") === "1"
  });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const result = await getPortalPurchaseReceipts(tenantContext.tenantId, parsedQuery.options, actorFromTenantContext(tenantContext));
    return noStore(
      NextResponse.json({
        readOnly: tenantContext.readOnly,
        tenantId: tenantContext.tenantId,
        items: Array.isArray(result.data?.items) ? result.data.items : [],
        page: result.data?.page || parsedQuery.options.page,
        pageSize: result.data?.pageSize || parsedQuery.options.pageSize,
        total: result.data?.total || 0
      })
    );
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

export async function POST(request: NextRequest) {
  const moduleGuard = await requireAppModuleApi("inventory", { permission: "manage_inventory_receipts" });
  if (moduleGuard.error) return moduleGuard.error;
  const tenantContext = await resolveAppTenant({ permission: "manage_inventory_receipts", requireWrite: true });
  if (tenantContext.error) return tenantContext.error;
  if (!isBackendConfigured()) return backendUnavailable();

  try {
    const body = await request.json().catch(() => null);
    const result = await createPortalPurchaseReceipt(
      tenantContext.tenantId,
      {
        supplierId: String(body?.supplierId || "").trim(),
        locationId: String(body?.locationId || "").trim(),
        documentNumber: body?.documentNumber || null,
        receivedAt: String(body?.receivedAt || "").trim(),
        notes: body?.notes || null,
        idempotencyKey: String(body?.idempotencyKey || "").trim(),
        items: Array.isArray(body?.items)
          ? body.items.map((item: Record<string, unknown>) => ({
              productId: String(item?.productId || "").trim(),
              quantity: String(item?.quantity || "").trim(),
              unitCost: typeof item?.unitCost === "string" ? item.unitCost : item?.unitCost == null ? undefined : String(item.unitCost),
              lotNumber: typeof item?.lotNumber === "string" ? item.lotNumber : undefined,
              expiresAt: typeof item?.expiresAt === "string" ? item.expiresAt : undefined
            }))
          : []
      },
      actorFromTenantContext(tenantContext)
    );

    return noStore(
      NextResponse.json(
        {
          ok: true,
          receipt: result.data.receipt,
          idempotent: result.data.idempotent
        },
        { status: result.data.idempotent ? 200 : 201 }
      )
    );
  } catch (error) {
    const backendBody = getBackendErrorBody(error);
    return noStore(
      NextResponse.json(
        backendBody && typeof backendBody === "object"
          ? backendBody
          : { error: error instanceof Error ? error.message : "backend_create_failed" },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
