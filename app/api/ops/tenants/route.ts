import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsApi } from "@/lib/saas/access";
import { appendAuditLog, applyIndustryTemplate, calculateHealthScore, daysActive, newId, readSaasData, touchTenantActivity, writeSaasData } from "@/lib/saas/store";
import type { TenantStatus } from "@/lib/saas/types";

const createTenantSchema = z.object({
  name: z.string().min(2),
  industry: z.string().min(2),
  status: z.enum(["active", "trial", "at_risk", "cancelled"]).default("trial"),
  crmName: z.string().optional().default(""),
  crmEnabled: z.boolean().optional().default(false),
  salesTeamSize: z.number().int().min(0).optional().default(0),
  website: z.string().optional().default(""),
  city: z.string().optional().default(""),
  country: z.string().optional().default(""),
  startAt: z.string().optional(),
  applyTemplate: z.boolean().optional().default(true)
});

export async function GET(request: NextRequest) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;

  const data = readSaasData();
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") as TenantStatus | null;

  const tenants = data.tenants
    .filter((tenant) => (statusFilter ? tenant.status === statusFilter : true))
    .map((tenant) => {
      const metrics = data.tenantMetrics.find((item) => item.tenantId === tenant.id);
      const health = calculateHealthScore(tenant.id);
      return {
        ...tenant,
        daysActive: daysActive(tenant),
        lastActivityAt: metrics?.lastActivityAt,
        healthScore: health.score,
        healthStatus: health.status
      };
    });

  return NextResponse.json({ tenants });
}

export async function POST(request: NextRequest) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;

  const payload = await request.json();
  const parsed = createTenantSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const data = readSaasData();
  const now = new Date().toISOString();
  const tenantId = newId("tenant");

  data.tenants.push({
    id: tenantId,
    name: input.name,
    industry: input.industry,
    status: input.status,
    createdAt: now,
    startAt: input.startAt || now,
    crmName: input.crmName,
    crmEnabled: input.crmEnabled,
    salesTeamSize: input.salesTeamSize,
    website: input.website,
    city: input.city,
    country: input.country
  });

  data.tenantMetrics.push({
    tenantId,
    messages7d: 0,
    webhookErrors7d: 0,
    activeConversations: 0,
    lastActivityAt: now
  });

  writeSaasData(data);

  if (input.applyTemplate) {
    applyIndustryTemplate(tenantId, input.industry);
  }

  appendAuditLog({
    tenantId,
    userId: guard.ctx?.userId,
    action: "tenant_created",
    entity: "tenant",
    entityId: tenantId
  });

  touchTenantActivity(tenantId);

  return NextResponse.json({ ok: true, tenantId }, { status: 201 });
}

