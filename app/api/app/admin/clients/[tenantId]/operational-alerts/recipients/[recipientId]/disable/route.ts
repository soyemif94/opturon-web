import { NextRequest } from "next/server";
import { proxyAdminTenantOperationalAlertsCanaryWrite } from "@/lib/admin-operational-alerts-canary-write-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ tenantId: string; recipientId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { tenantId, recipientId } = await context.params;
  return proxyAdminTenantOperationalAlertsCanaryWrite(request, tenantId, "recipientDisable", recipientId);
}
