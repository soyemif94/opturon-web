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

function normalizeText(value: unknown) {
  return String(value || "").trim().normalize("NFC");
}

function normalizePayload(payload: z.infer<typeof schema>) {
  return {
    enabled: Boolean(payload.enabled),
    alias: normalizeText(payload.alias),
    cbu: normalizeText(payload.cbu).replace(/\s+/g, ""),
    titular: normalizeText(payload.titular),
    bank: normalizeText(payload.bank),
    instructions: normalizeText(payload.instructions)
  };
}

function validateTransferPayload(payload: ReturnType<typeof normalizePayload>) {
  const fieldErrors: Record<string, string> = {};

  if (payload.enabled && !payload.alias && !payload.cbu) {
    fieldErrors.general = "Para activar transferencia, cargá al menos alias o CBU.";
  }

  if (payload.alias && !/^[a-z0-9._-]{6,40}$/i.test(payload.alias)) {
    fieldErrors.alias = "El alias debe tener entre 6 y 40 caracteres y usar solo letras, números, punto, guion o guion bajo.";
  }

  if (payload.cbu && !/^\d{22}$/.test(payload.cbu)) {
    fieldErrors.cbu = "El CBU debe tener 22 dígitos numéricos.";
  }

  return fieldErrors;
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
            transferConfig: emptyTransferConfig(),
            previewText: null
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
      return noStore(
        NextResponse.json(
          {
            error: "invalid_transfer_config_payload",
            detail: "La configuración recibida no es válida.",
            fieldErrors: parsed.error.flatten().fieldErrors
          },
          { status: 400 }
        )
      );
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

    const normalizedPayload = normalizePayload(parsed.data);
    const fieldErrors = validateTransferPayload(normalizedPayload);
    if (Object.keys(fieldErrors).length) {
      return noStore(
        NextResponse.json(
          {
            error: "invalid_transfer_config",
            detail: fieldErrors.general || fieldErrors.alias || fieldErrors.cbu || "Revisá los datos de transferencia.",
            fieldErrors
          },
          { status: 400 }
        )
      );
    }

    const result = await savePortalBotTransferConfig(tenantId, normalizedPayload);
    return noStore(NextResponse.json({ ok: true, settings: result.data.settings, source: "backend_real_tenant" }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error) as
      | { error?: string; detail?: string; details?: string; fieldErrors?: Record<string, string> }
      | undefined;

    return noStore(
      NextResponse.json(
        backendBody || {
          error: "transfer_config_save_failed",
          detail: error instanceof Error ? error.message : "No se pudo guardar la configuración de transferencia."
        },
        { status: getBackendErrorStatus(error) || 500 }
      )
    );
  }
}
