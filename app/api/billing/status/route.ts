import { NextResponse } from "next/server";
import { getBackendErrorStatus, getPortalSaasCheckoutStatus, isBackendConfigured, isPortalInternalAuthConfigured } from "@/lib/api";
import { resolvePortalBillingSession } from "@/lib/portal-billing-session";

export const runtime = "nodejs";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const actor = await resolvePortalBillingSession();
  if (!actor) return noStore(NextResponse.json({ error: "billing_actor_forbidden" }, { status: 403 }));
  if (!isBackendConfigured() || !isPortalInternalAuthConfigured()) {
    return noStore(NextResponse.json({ error: "billing_status_unavailable" }, { status: 503 }));
  }
  try {
    const result = await getPortalSaasCheckoutStatus(actor.tenantId, actor.actorUserId);
    return noStore(NextResponse.json({ status: result.data }));
  } catch (error) {
    return noStore(NextResponse.json(
      { error: getBackendErrorStatus(error) === 403 ? "billing_actor_forbidden" : "billing_status_unavailable" },
      { status: getBackendErrorStatus(error) || 502 }
    ));
  }
}
