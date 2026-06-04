import { NextRequest, NextResponse } from "next/server";
import {
  createAdminBillingSubscription,
  getBackendErrorBody,
  getBackendErrorStatus,
  listAdminBillingSubscriptions
} from "@/lib/admin-client-policy";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  const tenantId = request.nextUrl.searchParams.get("tenantId") || "";

  try {
    const result = await listAdminBillingSubscriptions(tenantId || undefined);
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_billing_subscriptions_load_failed",
          detail: error instanceof Error ? error.message : "No se pudieron cargar las suscripciones."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  const payload = await request.json().catch(() => ({}));

  try {
    const result = await createAdminBillingSubscription(payload);
    return noStore(NextResponse.json(result.data, { status: 201 }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_billing_subscription_create_failed",
          detail: error instanceof Error ? error.message : "No se pudo crear la suscripcion."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
