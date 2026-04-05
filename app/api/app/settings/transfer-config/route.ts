import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalBotTransferConfig,
  isBackendConfigured,
  savePortalBotTransferConfig
} from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  enabled: z.boolean().optional(),
  alias: z.string().optional(),
  cbu: z.string().optional(),
  titular: z.string().optional(),
  bank: z.string().optional(),
  instructions: z.string().optional()
});

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function emptyTransferConfig() {
  return {
    enabled: false,
    alias: "",
    cbu: "",
    titular: "",
    bank: "",
    instructions: ""
  };
}

export async function GET() {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  if (!tenantId || !isBackendConfigured()) {
    return noStore(
      NextResponse.json(
        {
          settings: {
            tenantId: tenantId || "",
            clinicId: "",
            clinicName: null,
            transferConfig: emptyTransferConfig()
          }
        },
        { status: tenantId ? 200 : 503 }
      )
    );
  }

  try {
    const result = await getPortalBotTransferConfig(tenantId);
    return noStore(NextResponse.json({ settings: result.data.settings, source: "backend_real_tenant" }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "transfer_config_load_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar la configuración de transferencia."
        },
        { status: getBackendErrorStatus(error) || 502 }
      )
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAppApi({ permission: "manage_workspace" });
  if (guard.error) return guard.error;
  const tenantId = guard.ctx?.tenantId as string;

  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return noStore(NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }));
    }

    if (!tenantId || !isBackendConfigured()) {
      return noStore(
        NextResponse.json(
          {
            error: "transfer_config_backend_not_configured",
            detail: "No hay backend persistente configurado para guardar transferencia."
          },
          { status: 503 }
        )
      );
    }

    const normalizedPayload = {
      enabled: Boolean(parsed.data.enabled),
      alias: String(parsed.data.alias || ""),
      cbu: String(parsed.data.cbu || ""),
      titular: String(parsed.data.titular || ""),
      bank: String(parsed.data.bank || ""),
      instructions: String(parsed.data.instructions || "")
    };

    const result = await savePortalBotTransferConfig(tenantId, normalizedPayload);
    return noStore(NextResponse.json({ ok: true, settings: result.data.settings, source: "backend_real_tenant" }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "transfer_config_save_failed",
          detail: error instanceof Error ? error.message : "No se pudo guardar la configuración de transferencia."
        },
        { status: getBackendErrorStatus(error) || 500 }
      )
    );
  }
}
