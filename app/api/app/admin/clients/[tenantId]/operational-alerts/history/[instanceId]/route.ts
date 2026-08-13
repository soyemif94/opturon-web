import { NextRequest } from "next/server";
import { proxyAdminTenantOperationalAlertsHistoryDetail } from "@/lib/admin-operational-alerts-read-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; instanceId: string }> }
) {
  const { tenantId, instanceId } = await params;
  return proxyAdminTenantOperationalAlertsHistoryDetail(request, tenantId, instanceId);
}
