import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testInstagramScopes() {
  const startRoute = read("app/api/app/integrations/instagram/start/route.ts");

  assert.match(startRoute, /"pages_show_list"/);
  assert.match(startRoute, /"instagram_basic"/);
  assert.match(startRoute, /"instagram_manage_messages"/);
  assert.match(startRoute, /"pages_manage_metadata"/);
  assert.match(startRoute, /"pages_read_engagement"/);
  assert.match(startRoute, /App Review \/ Advanced Access/);
}

function testInstagramIntegrationVisible() {
  const pageSource = read("app/app/integrations/page.tsx");
  const hubSource = read("components/app/integrations-hub.tsx");

  assert.match(pageSource, /getPortalInstagramStatus/);
  assert.match(pageSource, /instagramStatus=\{instagramStatus\}/);
  assert.match(hubSource, /Instagram Messaging/);
  assert.match(hubSource, /Conectar Instagram/);
  assert.match(hubSource, /Instagram esta disponible inicialmente en modo lectura dentro del Inbox/);
  assert.match(hubSource, /Las respuestas desde Instagram todavia no estan habilitadas/);
  assert.doesNotMatch(hubSource, /Instagram y Messenger quedan fuera del frente principal/);
}

function testInstagramErrorsAndAssetPicker() {
  const hubSource = read("components/app/integrations-hub.tsx");
  const callbackSource = read("app/api/app/integrations/instagram/callback/route.ts");
  const apiRouteSource = read("app/api/app/integrations/instagram/route.ts");

  assert.match(hubSource, /instagram_business_account_not_found/);
  assert.match(hubSource, /Meta no concedio todos los permisos necesarios/);
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
  testInstagramErrorsAndAssetPicker();
  testNoInstagramOutboundPromise();
  console.log("instagram-connection-ui.test.ts: ok");
}

run();
