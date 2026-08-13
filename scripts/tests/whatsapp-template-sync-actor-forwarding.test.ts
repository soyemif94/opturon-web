import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function run() {
  const route = read("app/api/app/integrations/whatsapp/templates/route.ts");
  const api = read("lib/api.ts");

  assert.match(route, /requireOpturonAdminApi\(\)/);
  assert.match(route, /resolveOpturonAdminActorId\(auth\.ctx\)/);
  assert.match(route, /syncPortalWhatsAppTemplates\(tenantId, portalActorId\)/);
  assert.match(route, /missing_opturon_admin_actor/);
  assert.doesNotMatch(route, /payload\.actorId/);
  assert.match(api, /syncPortalWhatsAppTemplates\(tenantId: string, portalActorId: string\)/);
  assert.match(api, /"x-portal-actor-id": safePortalActorId/);
  assert.match(api, /missing_opturon_admin_actor/);

  console.log("whatsapp-template-sync-actor-forwarding.test.ts: ok");
}

run();
