import { NextRequest } from "next/server";
import { proxyAdminTenantOperationalAlertsRuleDetail } from "@/lib/admin-operational-alerts-read-proxy";
import { proxyAdminTenantOperationalAlertsCanaryWrite } from "@/lib/admin-operational-alerts-canary-write-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ tenantId: string; ruleId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { tenantId, ruleId } = await context.params;
  return proxyAdminTenantOperationalAlertsRuleDetail(request, tenantId, ruleId);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { tenantId, ruleId } = await context.params;
  return proxyAdminTenantOperationalAlertsCanaryWrite(request, tenantId, "ruleUpdate", ruleId);
}
