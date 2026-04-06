import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalBusinessSettings,
  isBackendConfigured,
  patchPortalBusinessSettings
} from "@/lib/api";
import { appendAuditLog, readSaasData, writeSaasData } from "@/lib/saas/store";

const schema = z.object({
  legalName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  taxId: z.string().optional(),
  taxIdType: z.string().optional(),
  vatCondition: z.string().optional(),
  grossIncomeNumber: z.string().optional(),
  fiscalAddress: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  pointOfSaleSuggested: z.string().optional(),
  defaultSuggestedFiscalVoucherType: z.string().optional(),
  accountantEmail: z.string().optional(),
  accountantName: z.string().optional(),
  openingHours: z.string().optional(),
  address: z.string().optional(),
  deliveryZones: z.string().optional(),
  paymentMethods: z.string().optional(),
  policies: z.string().optional()
});

function emptySettings(tenantId: string) {
  return {
    tenantId,
    legalName: "",
    profileImageUrl: "",
    taxId: "",
    taxIdType: "NONE",
    vatCondition: "",
    grossIncomeNumber: "",
    fiscalAddress: "",
    city: "",
    province: "",
    pointOfSaleSuggested: "",
    defaultSuggestedFiscalVoucherType: "NONE",
    accountantEmail: "",
    accountantName: "",
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

  if (tenantId) {
    if (!isBackendConfigured()) {
      return noStore(
        NextResponse.json(
          {
            error: "business_backend_not_configured",
            detail: "No hay backend persistente configurado para cargar los datos del negocio."
          },
          { status: 503 }
        )
      );
    }

    try {
      const result = await getPortalBusinessSettings(tenantId);
      return noStore(NextResponse.json({ settings: result.data.settings, source: "backend_real_tenant" }));
    } catch (error) {
      return noStore(
        NextResponse.json(
          getBackendErrorBody(error) || {
            error: "business_load_failed",
            detail: error instanceof Error ? error.message : "No se pudieron cargar los datos del negocio."
          },
          { status: getBackendErrorStatus(error) || 502 }
        )
      );
    }
  }

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

    if (tenantId) {
      if (!isBackendConfigured()) {
        return noStore(
          NextResponse.json(
            {
              error: "business_backend_not_configured",
              detail: "No hay backend persistente configurado para guardar los datos del negocio."
            },
            { status: 503 }
          )
        );
      }

      const normalizedPayload = {
        legalName: String(parsed.data.legalName || ""),
        profileImageUrl: String(parsed.data.profileImageUrl || ""),
        taxId: String(parsed.data.taxId || ""),
        taxIdType: String(parsed.data.taxIdType || "NONE"),
        vatCondition: String(parsed.data.vatCondition || ""),
        grossIncomeNumber: String(parsed.data.grossIncomeNumber || ""),
        fiscalAddress: String(parsed.data.fiscalAddress || ""),
        city: String(parsed.data.city || ""),
        province: String(parsed.data.province || ""),
        pointOfSaleSuggested: String(parsed.data.pointOfSaleSuggested || ""),
        defaultSuggestedFiscalVoucherType: String(parsed.data.defaultSuggestedFiscalVoucherType || "NONE"),
        accountantEmail: String(parsed.data.accountantEmail || ""),
        accountantName: String(parsed.data.accountantName || ""),
        openingHours: String(parsed.data.openingHours || ""),
        address: String(parsed.data.address || ""),
        deliveryZones: String(parsed.data.deliveryZones || ""),
        paymentMethods: String(parsed.data.paymentMethods || ""),
        policies: String(parsed.data.policies || "")
      };
      const result = await patchPortalBusinessSettings(tenantId, normalizedPayload);
      return noStore(NextResponse.json({ ok: true, settings: result.data.settings, source: "backend_real_tenant" }));
    }

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
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "business_save_failed",
          detail: error instanceof Error ? error.message : "No se pudieron guardar los datos del negocio."
        },
        { status: getBackendErrorStatus(error) || 500 }
      )
    );
  }
}
