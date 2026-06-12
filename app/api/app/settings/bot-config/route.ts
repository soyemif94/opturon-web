import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAppApi } from "@/lib/saas/access";
import {
  getBackendErrorBody,
  getBackendErrorStatus,
  getPortalBotSettings,
  isBackendConfigured,
  patchPortalBotSettings
} from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const schema = z.object({
  name: z.string().optional(),
  greetingMessage: z.string().optional(),
  tone: z.enum(["amigable", "profesional", "calido"]).optional(),
  treatment: z.enum(["vos", "usted"]).optional(),
  outOfHoursMessage: z.string().optional(),
  fallbackMessage: z.string().optional(),
  handoffMessage: z.string().optional()
});

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function emptyBotConfig() {
  return {
    tenantId: "",
    clinicId: "",
    clinicName: null,
    mode: "automatic" as const,
    botConfig: {
      name: "",
      greetingMessage: "",
      tone: "amigable" as const,
      treatment: "vos" as const,
      outOfHoursMessage: "",
      fallbackMessage: "",
      handoffMessage: ""
    }
  };
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().normalize("NFC").slice(0, maxLength);
}

function normalizePayload(payload: z.infer<typeof schema>) {
  return {
    name: normalizeText(payload.name, 80),
    greetingMessage: normalizeText(payload.greetingMessage, 500),
    tone: payload.tone || "amigable",
    treatment: payload.treatment || "vos",
    outOfHoursMessage: normalizeText(payload.outOfHoursMessage, 500),
    fallbackMessage: normalizeText(payload.fallbackMessage, 500),
    handoffMessage: normalizeText(payload.handoffMessage, 500)
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
            ...emptyBotConfig(),
            tenantId: tenantId || ""
          }
        },
        { status: tenantId ? 200 : 503 }
      )
    );
  }

  try {
    const result = await getPortalBotSettings(tenantId);
    return noStore(NextResponse.json({ settings: result.data.settings, source: "backend_real_tenant" }));
  } catch (error) {
    return noStore(
      NextResponse.json(
        getBackendErrorBody(error) || {
          error: "bot_config_load_failed",
          detail: error instanceof Error ? error.message : "No se pudo cargar la configuracion del bot."
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
            error: "invalid_bot_config_payload",
            detail: "La configuracion recibida no es valida.",
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
            error: "bot_config_backend_not_configured",
            detail: "No hay backend persistente configurado para guardar la configuracion del bot."
          },
          { status: 503 }
        )
      );
    }

    const result = await patchPortalBotSettings(tenantId, {
      botConfig: normalizePayload(parsed.data)
    });
    return noStore(NextResponse.json({ ok: true, settings: result.data.settings, source: "backend_real_tenant" }));
  } catch (error) {
    const backendBody = getBackendErrorBody(error) as
      | { error?: string; detail?: string; details?: string; fieldErrors?: Record<string, string> }
      | undefined;

    return noStore(
      NextResponse.json(
        backendBody || {
          error: "bot_config_save_failed",
          detail: error instanceof Error ? error.message : "No se pudo guardar la configuracion del bot."
        },
        { status: getBackendErrorStatus(error) || 500 }
      )
    );
  }
}
