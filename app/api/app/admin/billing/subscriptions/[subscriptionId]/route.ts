import { NextRequest, NextResponse } from "next/server";
import { getAdminBillingSubscription, getBackendErrorBody, getBackendErrorStatus } from "@/lib/admin-client-policy";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ subscriptionId: string }> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  const { subscriptionId } = await params;

  try {
    const result = await getAdminBillingSubscription(subscriptionId);
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_billing_subscription_read_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar la suscripcion."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
