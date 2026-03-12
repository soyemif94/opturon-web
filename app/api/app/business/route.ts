import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import { appendAuditLog, readSaasData, writeSaasData } from "@/lib/saas/store";

const schema = z.object({
  openingHours: z.string().optional(),
  address: z.string().optional(),
  deliveryZones: z.string().optional(),
  paymentMethods: z.string().optional(),
  policies: z.string().optional()
});

function emptySettings(tenantId: string) {
  return {
    tenantId,
    openingHours: "",
    address: "",
    deliveryZones: "",
    paymentMethods: "",
    policies: ""
  };
}

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET() {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  try {
    const data = readSaasData();
    const businessSettings = Array.isArray(data.businessSettings) ? data.businessSettings : [];
    const settings = businessSettings.find((item) => item?.tenantId === tenantId) || emptySettings(tenantId);

    return noStore(NextResponse.json({ settings }));
  } catch (error) {
    console.error("[api/app/business][GET] Failed to load business settings.", error);
    return noStore(NextResponse.json({ error: "No se pudieron cargar los datos del negocio." }, { status: 500 }));
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = readSaasData();
    if (!Array.isArray(data.businessSettings)) data.businessSettings = [];

    let settings = data.businessSettings.find((item) => item?.tenantId === tenantId);
    if (!settings) {
      settings = { id: `biz_${Date.now()}`, ...emptySettings(tenantId) };
      data.businessSettings.push(settings);
    }

    Object.assign(settings, parsed.data);
    writeSaasData(data);

    appendAuditLog({
      tenantId,
      userId: guard.ctx?.userId,
      action: "business_updated",
      entity: "business_settings",
      entityId: settings.id
    });

    return noStore(NextResponse.json({ ok: true, settings }));
  } catch (error) {
    console.error("[api/app/business][PATCH] Failed to save business settings.", error);
    return noStore(NextResponse.json({ error: "No se pudieron guardar los datos del negocio." }, { status: 500 }));
  }
}
