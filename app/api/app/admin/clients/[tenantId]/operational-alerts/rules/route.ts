import { NextRequest } from "next/server";
import { proxyAdminTenantOperationalAlertsRead } from "@/lib/admin-operational-alerts-read-proxy";
import { proxyAdminTenantOperationalAlertsCanaryWrite } from "@/lib/admin-operational-alerts-canary-write-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return proxyAdminTenantOperationalAlertsRead(request, tenantId, "rules");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return proxyAdminTenantOperationalAlertsCanaryWrite(request, tenantId, "ruleCreate");
}
