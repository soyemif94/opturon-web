import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  assert.match(startRoute, /META_INSTAGRAM_LOGIN_CONFIG_ID/);
  assert.match(startRoute, /META_INSTAGRAM_OAUTH_PROVIDER/);
  assert.match(startRoute, /META_INSTAGRAM_BUSINESS_APP_ID/);
  assert.match(startRoute, /https:\/\/www\.instagram\.com\/oauth\/authorize/);
  assert.match(startRoute, /https:\/\/www\.facebook\.com\/\$\{config\.graphVersion\}\/dialog\/oauth/);
  assert.match(startRoute, /config_id/);
  assert.match(startRoute, /Facebook Login for Business uses config_id/);
  assert.match(startRoute, /url\.searchParams\.set\("config_id", config\.loginConfigId\)/);
  assert.match(startRoute, /config\.instagramLoginScopes\.join\(","\)/);
  assert.match(startRoute, /config\.facebookLoginScopes\.join\(","\)/);
  assert.match(startRoute, /"pages_show_list"/);
  assert.match(startRoute, /"instagram_business_basic"/);
  assert.match(startRoute, /"instagram_business_manage_messages"/);
  assert.match(startRoute, /"instagram_business_manage_comments"/);
  assert.match(startRoute, /"pages_read_engagement"/);
  assert.doesNotMatch(startRoute, /"instagram_basic"/);
  assert.doesNotMatch(startRoute, /"instagram_manage_messages"/);
  assert.doesNotMatch(startRoute, /"pages_manage_metadata"/);

  const instagramScopes = startRoute.match(/instagramLoginScopes:\s*\[([\s\S]*?)\]/)?.[1] || "";
  assert.doesNotMatch(instagramScopes, /pages_/);
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
  assert.match(hubSource, /Instagram esta disponible inicialmente en modo lectura dentro del Inbox/);
  assert.match(hubSource, /Las respuestas desde Instagram todavia no estan habilitadas/);
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
  assert.match(callbackSource, /Buffer\.from\(JSON\.stringify\(candidates\)\)\.toString\("base64url"\)/);
  assert.match(apiRouteSource, /selectionToken/);
  assert.match(apiRouteSource, /selectedPageId/);
  assert.match(apiRouteSource, /selectedInstagramUserId/);
}

function testNoInstagramOutboundPromise() {
  const hubSource = read("components/app/integrations-hub.tsx");

  assert.doesNotMatch(hubSource, /Responder desde Instagram/);
  assert.doesNotMatch(hubSource, /Enviar mensajes por Instagram/);
  assert.doesNotMatch(hubSource, /Bot de Instagram/);
}

function run() {
  testInstagramScopes();
  testInstagramIntegrationVisible();
  testSafeInstagramOauthLogging();
  testInstagramErrorsAndAssetPicker();
  testNoInstagramOutboundPromise();
  console.log("instagram-connection-ui.test.ts: ok");
}

run();
