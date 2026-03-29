import { NextRequest, NextResponse } from "next/server";
import { connectPortalInstagram, getBackendErrorStatus, isBackendConfigured } from "@/lib/api";
import { requireAppApi } from "@/lib/saas/access";

const INSTAGRAM_STATE_COOKIE = "opturon_instagram_oauth_state";
const INSTAGRAM_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function parseStateValue(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { tenantId?: string; nonce?: string; at?: number };
    return {
      tenantId: String(parsed.tenantId || "").trim() || null,
      nonce: String(parsed.nonce || "").trim() || null,
      at: Number(parsed.at || 0)
    };
  } catch {
    return null;
  }
}

function parseStateParam(value: string | null) {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    return parseStateValue(decoded);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const code = String(url.searchParams.get("code") || "").trim();
  const stateParam = String(url.searchParams.get("state") || "").trim() || null;
  const error = String(url.searchParams.get("error") || "").trim();
  const errorDescription = String(url.searchParams.get("error_description") || "").trim();
  const redirectTarget = new URL("/app/integrations", request.nextUrl.origin);
  const redirectUri = new URL("/api/app/integrations/instagram/callback", request.nextUrl.origin).toString();
  const cookieState = parseStateValue(request.cookies.get(INSTAGRAM_STATE_COOKIE)?.value || null);
  const paramState = parseStateParam(stateParam);

  const clearCookie = (response: NextResponse) => {
    response.cookies.set({
      name: INSTAGRAM_STATE_COOKIE,
      value: "",
      expires: new Date(0),
      path: "/"
    });
    return response;
  };

  if (error) {
    console.warn("[instagram-oauth] callback_error", {
      tenantId: auth.ctx.tenantId || null,
      error,
      errorDescription: errorDescription || null
    });
    redirectTarget.searchParams.set("instagram", "error");
    redirectTarget.searchParams.set("reason", errorDescription || error);
    return clearCookie(NextResponse.redirect(redirectTarget));
  }

  const isFreshState = Boolean(paramState && Number.isFinite(paramState.at) && Date.now() - paramState.at <= INSTAGRAM_STATE_MAX_AGE_MS);
  const validState =
    Boolean(cookieState && paramState) &&
    cookieState?.tenantId &&
    paramState?.tenantId &&
    cookieState.tenantId === paramState.tenantId &&
    cookieState.nonce &&
    paramState.nonce &&
    cookieState.nonce === paramState.nonce &&
    isFreshState;

  if (!validState || !auth.ctx.tenantId || auth.ctx.tenantId !== paramState?.tenantId) {
    console.warn("[instagram-oauth] callback_invalid_state", {
      sessionTenantId: auth.ctx.tenantId || null,
      paramTenantId: paramState?.tenantId || null,
      hasCookieState: Boolean(cookieState),
      hasParamState: Boolean(paramState),
      isFreshState
    });
    redirectTarget.searchParams.set("instagram", "error");
    redirectTarget.searchParams.set("reason", "invalid_state");
    return clearCookie(NextResponse.redirect(redirectTarget));
  }

  if (!auth.ctx.tenantId || !code || !isBackendConfigured()) {
    console.warn("[instagram-oauth] callback_missing_prerequisites", {
      tenantId: auth.ctx.tenantId || null,
      hasCode: Boolean(code),
      backendConfigured: isBackendConfigured()
    });
    redirectTarget.searchParams.set("instagram", "error");
    redirectTarget.searchParams.set("reason", !code ? "missing_code" : "backend_not_configured");
    return clearCookie(NextResponse.redirect(redirectTarget));
  }

  try {
    console.info("[instagram-oauth] callback_connect_started", {
      tenantId: auth.ctx.tenantId,
      redirectUri
    });
    await connectPortalInstagram(auth.ctx.tenantId, {
      code,
      redirectUri
    });
    redirectTarget.searchParams.set("instagram", "connected");
    console.info("[instagram-oauth] callback_connect_succeeded", {
      tenantId: auth.ctx.tenantId
    });
    return clearCookie(NextResponse.redirect(redirectTarget));
  } catch (connectError) {
    console.error("[instagram-oauth] callback_connect_failed", {
      tenantId: auth.ctx.tenantId,
      status: getBackendErrorStatus(connectError) || null,
      message: connectError instanceof Error ? connectError.message : "instagram_connect_failed"
    });
    redirectTarget.searchParams.set("instagram", "error");
    redirectTarget.searchParams.set(
      "reason",
      String(getBackendErrorStatus(connectError) || (connectError instanceof Error ? connectError.message : "instagram_connect_failed"))
    );
    return clearCookie(NextResponse.redirect(redirectTarget));
  }
}
