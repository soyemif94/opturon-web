import { NextRequest, NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  sendAdminBillingSubscriptionLink
} from "@/lib/admin-client-policy";
import { requireOpturonAdminApi } from "@/lib/saas/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<unknown> }) {
  const guard = await requireOpturonAdminApi();
  if (guard.error) return guard.error;

  const { tenantId } = (await params) as { tenantId: string };

  try {
    const result = await sendAdminBillingSubscriptionLink(tenantId);
    return noStore(NextResponse.json(result.data));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "admin_billing_subscription_send_link_failed",
          detail: error instanceof Error ? error.message : "No se pudo enviar el link de suscripcion."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}
