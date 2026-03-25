import { NextResponse } from "next/server";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalPaymentDestinations,
  getPortalUsers,
  isBackendConfigured
} from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const guard = await requireAppApi({ permission: "edit_workspace" });
  if (guard.error) return guard.error;

  if (!isBackendConfigured()) {
    return noStore(NextResponse.json({ error: "orders_backend_unavailable" }, { status: 503 }));
  }

  try {
    const tenantId = String(guard.ctx?.tenantId || "").trim();
    const [usersResponse, destinationsResponse] = await Promise.all([
      getPortalUsers(tenantId),
      getPortalPaymentDestinations(tenantId).catch(() => null)
    ]);
    const sellers = (usersResponse.data.users || [])
      .filter((user) => user && user.role !== "viewer")
      .map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role
      }));
    const paymentDestinations = Array.isArray(destinationsResponse?.data?.paymentDestinations)
      ? destinationsResponse.data.paymentDestinations
      : [];

    return noStore(
      NextResponse.json({
        sellers,
        paymentDestinations,
        currentUserId: guard.ctx?.userId || null
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
