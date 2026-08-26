import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fingerprintInstagramOAuthCode } from "../../lib/instagram-oauth-code-telemetry.ts";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testInstagramScopes() {
  const startRoute = read("app/api/app/integrations/instagram/start/route.ts");

  assert.match(
    startRoute,
    /env\.META_INSTAGRAM_OAUTH_APP_ID\s*\|\|\s*env\.META_INSTAGRAM_APP_ID\s*\|\|\s*env\.META_APP_ID/
  );
  assert.match(startRoute, /Meta\/Facebook App ID/);
  assert.match(startRoute, /not the internal "Instagram App ID"/);
  assert.match(startRoute, /const provider = "instagram_login"/);
  assert.match(startRoute, /META_INSTAGRAM_BUSINESS_APP_ID/);
  assert.match(startRoute, /https:\/\/www\.instagram\.com\/oauth\/authorize/);
  assert.match(startRoute, /url\.searchParams\.set\("force_reauth", "true"\)/);
  assert.match(startRoute, /https:\/\/www\.facebook\.com\/\$\{config\.graphVersion\}\/dialog\/oauth/);
  assert.match(startRoute, /config\.instagramLoginScopes\.join\(","\)/);
  assert.match(startRoute, /"instagram_business_basic"/);
  assert.match(startRoute, /"instagram_business_manage_messages"/);
  assert.doesNotMatch(startRoute, /"pages_show_list"/);
  assert.doesNotMatch(startRoute, /"instagram_basic"/);
  assert.doesNotMatch(startRoute, /"instagram_manage_messages"/);
  assert.doesNotMatch(startRoute, /"pages_manage_metadata"/);
  assert.equal((startRoute.match(/url\.searchParams\.set\("force_reauth", "true"\)/g) || []).length, 1);
  assert.match(startRoute, /url\.searchParams\.set\("state", state\)/);

  const instagramScopes = startRoute.match(/instagramLoginScopes:\s*\[([\s\S]*?)\]/)?.[1] || "";
  assert.doesNotMatch(instagramScopes, /pages_/);
  assert.doesNotMatch(instagramScopes, /instagram_business_manage_comments/);

  const allScopes = startRoute.match(/instagramLoginScopes:\s*\[([\s\S]*?)\]/)?.[1] || "";
  assert.equal((allScopes.match(/"instagram_business_/g) || []).length, 2);
}

function testInstagramCodeTelemetryIsFingerprintOnly() {
  const callbackSource = read("app/api/app/integrations/instagram/callback/route.ts");
  const telemetrySource = read("lib/instagram-oauth-code-telemetry.ts");

  assert.match(callbackSource, /stage: "CALLBACK_RAW"/);
  assert.match(callbackSource, /stage: "CALLBACK_PARSED"/);
  assert.match(callbackSource, /stage: "BFF_FORWARDED"/);
  assert.match(callbackSource, /codeTelemetryId/);
  assert.match(telemetrySource, /createHash\("sha256"\)/);
  assert.doesNotMatch(callbackSource, /code:\s*code/);

  const input = "test-opaque-authorization-code";
  const first = fingerprintInstagramOAuthCode(input);
  const second = fingerprintInstagramOAuthCode(input);
  assert.deepEqual(first, second);
  assert.equal(first.length, Buffer.byteLength(input, "utf8"));
  assert.match(first.sha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(first), /test-opaque-authorization-code/);
}

function testInstagramIntegrationVisible() {
  const pageSource = read("app/app/integrations/page.tsx");
  const hubSource = read("components/app/integrations-hub.tsx");

  assert.match(pageSource, /getPortalInstagramStatus/);
  assert.match(pageSource, /instagramStatus=\{instagramStatus\}/);
  assert.match(hubSource, /Instagram Messaging/);
  assert.match(hubSource, /Conectar Instagram/);
  assert.match(hubSource, /<a href="\/api\/app\/integrations\/instagram\/start">Conectar Instagram<\/a>/);
  assert.doesNotMatch(
    hubSource,
    /<Link href="\/api\/app\/integrations\/instagram\/start">Conectar Instagram<\/Link>/
  );
  assert.doesNotMatch(hubSource, /instagram\/start\?_rsc/);
  assert.match(hubSource, /pueden responderse cuando el canal conectado esta activo/);
  assert.doesNotMatch(hubSource, /Instagram y Messenger quedan fuera del frente principal/);
}

function testSafeInstagramOauthLogging() {
  const startRoute = read("app/api/app/integrations/instagram/start/route.ts");

  assert.match(startRoute, /selectedProvider: config\.provider/);
  assert.match(startRoute, /selectedAppIdSource: config\.appIdSource/);
  assert.match(startRoute, /selectedAppIdSuffix: config\.appId\.slice\(-6\)/);
  assert.match(startRoute, /authorizeHost: url\.host/);
  assert.match(startRoute, /hasConfigId: Boolean\(config\.loginConfigId\)/);
  assert.match(startRoute, /hasScopes: Boolean\(url\.searchParams\.get\("scope"\)\)/);
  assert.doesNotMatch(startRoute, /state:\s*state/);
}

function testInstagramErrorsAndAssetPicker() {
  const hubSource = read("components/app/integrations-hub.tsx");
  const callbackSource = read("app/api/app/integrations/instagram/callback/route.ts");
  const apiRouteSource = read("app/api/app/integrations/instagram/route.ts");
  const startRoute = read("app/api/app/integrations/instagram/start/route.ts");

  assert.match(hubSource, /instagram_business_account_not_found/);
  assert.match(hubSource, /Meta rechazo los permisos solicitados/);
  assert.match(hubSource, /Login Configuration ID/);
  assert.match(hubSource, /invalid_scope/);
  assert.match(hubSource, /invalid scopes/);
  assert.match(hubSource, /instagram_multiple_assets_found/);
  assert.match(hubSource, /No se muestran tokens ni credenciales/);
  assert.match(hubSource, /selectionToken/);
  assert.match(hubSource, /selectedPageId/);
  assert.match(hubSource, /selectedInstagramUserId/);
  assert.match(callbackSource, /instagram_multiple_assets_found/);
  assert.match(callbackSource, /oauthProvider:\s*[\s\S]*paramState\?\.provider === "instagram_login" \|\| paramState\?\.provider === "facebook_login"/);
  assert.match(startRoute, /provider: config\.provider/);
  assert.match(callbackSource, /Buffer\.from\(JSON\.stringify\(candidates\)\)\.toString\("base64url"\)/);
  assert.match(apiRouteSource, /selectionToken/);
  assert.match(apiRouteSource, /selectedPageId/);
  assert.match(apiRouteSource, /selectedInstagramUserId/);
}

function testCallbackProviderValidation() {
  const callbackSource = read("app/api/app/integrations/instagram/callback/route.ts");

  assert.match(callbackSource, /rawProvider === ""/);
  assert.match(callbackSource, /rawProvider === "instagram_login" \|\| rawProvider === "facebook_login"/);
  assert.match(callbackSource, /cookieState\.provider !== "__invalid__"/);
  assert.match(callbackSource, /paramState\.provider !== "__invalid__"/);
  assert.match(callbackSource, /cookieState\.provider === paramState\.provider/);
}

function testNoInstagramOutboundPromise() {
  const hubSource = read("components/app/integrations-hub.tsx");

  assert.doesNotMatch(hubSource, /Responder desde Instagram/);
  assert.doesNotMatch(hubSource, /Enviar mensajes por Instagram/);
  assert.doesNotMatch(hubSource, /Bot de Instagram/);
}

function run() {
  testInstagramScopes();
  testInstagramCodeTelemetryIsFingerprintOnly();
  testInstagramIntegrationVisible();
  testSafeInstagramOauthLogging();
  testInstagramErrorsAndAssetPicker();
  testCallbackProviderValidation();
  testNoInstagramOutboundPromise();
  console.log("instagram-connection-ui.test.ts: ok");
}

run();
