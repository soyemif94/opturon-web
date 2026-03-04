import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsApi } from "@/lib/saas/access";
import { appendAuditLog, calculateHealthScore, daysActive, readSaasData, writeSaasData } from "@/lib/saas/store";

const updateSchema = z.object({
  status: z.enum(["active", "trial", "at_risk", "cancelled"]).optional(),
  crmName: z.string().optional(),
  crmEnabled: z.boolean().optional(),
  salesTeamSize: z.number().int().min(0).optional(),
  website: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional()
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;
  const { tenantId } = await params;

  const data = readSaasData();
  const tenant = data.tenants.find((item) => item.id === tenantId);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const health = calculateHealthScore(tenantId);

  return NextResponse.json({
    tenant,
    daysActive: daysActive(tenant),
    health,
    notes: data.tenantNotes.filter((item) => item.tenantId === tenantId),
    tasks: data.tenantTasks.filter((item) => item.tenantId === tenantId),
    activity: data.auditLog.filter((item) => item.tenantId === tenantId).slice(0, 100)
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const guard = await requireOpsApi();
  if (guard.error) return guard.error;
  const { tenantId } = await params;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = readSaasData();
  const tenant = data.tenants.find((item) => item.id === tenantId);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  Object.assign(tenant, parsed.data);
  writeSaasData(data);

  appendAuditLog({
    tenantId,
    userId: guard.ctx?.userId,
    action: "tenant_updated",
    entity: "tenant",
    entityId: tenantId,
    metadata: parsed.data
  });

  return NextResponse.json({ ok: true });
}

