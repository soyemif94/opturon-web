import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireAppApi } from "@/lib/saas/access";

const INSTAGRAM_STATE_COOKIE = "opturon_instagram_oauth_state";
const INSTAGRAM_STATE_MAX_AGE_SECONDS = 10 * 60;

function resolveInstagramOauthConfig() {
  const appId = String(
    process.env.NEXT_PUBLIC_META_APP_ID ||
      process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_APP_ID ||
      process.env.WHATSAPP_APP_ID ||
      ""
  ).trim();

  return {
    appId,
    graphVersion: String(
      process.env.NEXT_PUBLIC_WHATSAPP_GRAPH_VERSION || process.env.WHATSAPP_GRAPH_VERSION || "v25.0"
    ).trim(),
    callbackPath: "/api/app/integrations/instagram/callback",
    scopes: [
      "pages_show_list",
      "pages_manage_metadata",
      "instagram_basic",
      "instagram_manage_messages"
    ]
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAppApi({ permission: "manage_workspace" });
  if (auth.error) return auth.error;

  if (!auth.ctx.tenantId) {
    return NextResponse.redirect(
      new URL("/app/integrations?instagram=error&reason=missing_tenant_context", request.nextUrl.origin)
    );
  }

  const config = resolveInstagramOauthConfig();
  if (!config.appId) {
    return NextResponse.redirect(
      new URL("/app/integrations?instagram=error&reason=missing_meta_app_id", request.nextUrl.origin)
    );
  }

  const redirectUri = new URL(config.callbackPath, request.nextUrl.origin).toString();
  const statePayload = {
    tenantId: auth.ctx.tenantId,
    nonce: crypto.randomUUID(),
    at: Date.now()
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(","));

  console.info("[instagram-oauth] start", {
    tenantId: auth.ctx.tenantId,
    redirectUri,
    stateAgeSec: INSTAGRAM_STATE_MAX_AGE_SECONDS
  });

  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: INSTAGRAM_STATE_COOKIE,
    value: JSON.stringify(statePayload),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: INSTAGRAM_STATE_MAX_AGE_SECONDS,
    path: "/"
  });
  return response;
}
