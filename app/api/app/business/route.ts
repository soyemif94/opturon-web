import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import { appendAuditLog, ensureBusinessSettings, readSaasData, writeSaasData } from "@/lib/saas/store";

const schema = z.object({
  openingHours: z.string().optional(),
  address: z.string().optional(),
  deliveryZones: z.string().optional(),
  paymentMethods: z.string().optional(),
  policies: z.string().optional()
});

export async function GET() {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  const settings = ensureBusinessSettings(tenantId);
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAppApi();
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = readSaasData();
  let settings = data.businessSettings.find((item) => item.tenantId === tenantId);
  if (!settings) {
    settings = { id: `biz_${Date.now()}`, tenantId };
    data.businessSettings.push(settings);
  }
  Object.assign(settings, parsed.data);
  writeSaasData(data);

  appendAuditLog({ tenantId, userId: guard.ctx?.userId, action: "business_updated", entity: "business_settings", entityId: settings.id });

  return NextResponse.json({ ok: true, settings });
}

