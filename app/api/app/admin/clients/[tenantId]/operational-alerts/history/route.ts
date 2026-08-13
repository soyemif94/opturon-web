import { NextRequest } from "next/server";
import { proxyAdminTenantOperationalAlertsRead } from "@/lib/admin-operational-alerts-read-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return proxyAdminTenantOperationalAlertsRead(request, tenantId, "history");
}
