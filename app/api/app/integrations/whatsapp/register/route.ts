import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl, getPortalWhatsAppStatus, isBackendConfigured } from "@/lib/api";
import { applyPortalInternalAuth } from "@/lib/portal-internal-auth";
import { requireAppApi } from "@/lib/saas/access";

const ROUTE = "/api/app/integrations/whatsapp/register";
const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};

function canonicalOrigin(request: NextRequest) {
  const configured = String((typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL)) || "https://www.opturon.com").replace(/\/+$/, "");
  try { return new URL(configured).origin; } catch { return request.nextUrl.origin; }
}

function page(message: string, status = 200, last4?: string, completed = false) {
  return new NextResponse(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Registrar WhatsApp · Opturon</title><style>body{font:16px system-ui,sans-serif;background:#f4f6f8;color:#17212f;margin:0;padding:32px 20px}main{max-width:520px;margin:48px auto;padding:28px;background:white;border-radius:16px}h1{font-size:24px}p{line-height:1.6}button{font:inherit;background:#13795b;color:white;border:0;border-radius:8px;padding:12px 18px;cursor:pointer}a{color:#13795b}nav{margin-top:24px}</style></head><body><main><h1>Registrar número de WhatsApp</h1><p>${message}</p>${last4 ? `<p>Número del workspace: •••• ${last4}</p>` : ""}${last4 && !completed ? `<form method="post" action="${ROUTE}"><input type="hidden" name="confirm" value="register_current_channel"><button type="submit">Registrar este número</button></form>` : ""}<nav><a href="/app/integrations">Volver a Integraciones</a>${status >= 400 ? ` · <a href="${ROUTE}">Volver a intentar</a>` : ""}</nav></main></body></html>`, { status, headers: RESPONSE_HEADERS });
}

async function authority() {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return { error: auth.error };
  const { accountScope, globalRole, tenantRole } = auth.ctx;
  const tenantId = String(auth.ctx.tenantId || "").trim();
  const actorId = String(auth.ctx.userId || "").trim();
  if (accountScope !== "client" || globalRole !== "client" ||
      !["owner", "manager"].includes(String(tenantRole)) || !tenantId || !actorId) {
    return { error: page("No tenés permiso para registrar este número.", 403) };
  }
  if (!isBackendConfigured()) return { error: page("El servicio no está disponible en este momento.", 503) };
  return { tenantId, actorId };
}

async function currentNumber(tenantId: string) {
  const result = await getPortalWhatsAppStatus(tenantId);
  const channel = result.data?.channel;
  const digits = String(channel?.displayPhoneNumber || "").replace(/\D/g, "");
  if (result.success !== true || result.data?.ok !== true || result.data.tenantId !== tenantId ||
      !result.data.clinicId || !channel?.channelId || !channel.phoneNumberId ||
      channel.provider !== "whatsapp_cloud" || digits.length < 4) {
    throw new Error("current_channel_unavailable");
  }
  return digits.slice(-4);
}

export async function GET(request: NextRequest) {
  const auth = await authority();
  if (auth.error) return auth.error;
  const query = request.nextUrl.searchParams;
  if ([...query.keys()].some((key) => key !== "result") || query.getAll("result").length > 1 ||
      (query.has("result") && query.get("result") !== "completed")) {
    return page("La solicitud no es válida.", 400);
  }
  try {
    const last4 = await currentNumber(auth.tenantId!);
    // This navigation flag describes the last request; it is not registration-state evidence.
    const completed = query.get("result") === "completed";
    return page(completed
      ? "Solicitud completada. Revisá el estado actual del canal en Integraciones."
      : "Completá el registro del número de este workspace para usar WhatsApp Cloud API.", 200, last4, completed);
  } catch {
    return page("No pudimos verificar el número de este workspace. Volvé a intentar.", 502);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authority();
  if (auth.error) return auth.error;
  if (request.headers.get("origin") !== canonicalOrigin(request)) {
    return page("La solicitud no proviene de este sitio.", 403);
  }
  if (request.nextUrl.search || request.headers.get("content-type")?.split(";")[0].trim() !== "application/x-www-form-urlencoded") {
    return page("La solicitud no es válida.", 400);
  }
  const raw = await request.text().catch(() => "");
  const body = new URLSearchParams(raw);
  if (raw.length > 128 || [...body.keys()].length !== 1 ||
      body.get("confirm") !== "register_current_channel") {
    return page("La solicitud no es válida.", 400);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    await currentNumber(auth.tenantId!);
    const path = `/portal/tenants/${encodeURIComponent(auth.tenantId!)}/whatsapp/register`;
    const headers = new Headers({
      "Content-Type": "application/json",
      "x-portal-actor-id": auth.actorId!,
      "x-active-tenant-id": auth.tenantId!
    });
    applyPortalInternalAuth(path, headers);
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST", headers, body: "{}", cache: "no-store", redirect: "error", signal: controller.signal
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true || result?.data?.registered !== true) {
      return page("No se confirmó el registro. Podés volver a intentar.", 502);
    }
    return NextResponse.redirect(new URL(`${ROUTE}?result=completed`, canonicalOrigin(request)), {
      status: 303, headers: { "Cache-Control": "private, no-store" }
    });
  } catch {
    return page("No se confirmó el registro. Podés volver a intentar.", 502);
  } finally {
    clearTimeout(timeout);
  }
}
