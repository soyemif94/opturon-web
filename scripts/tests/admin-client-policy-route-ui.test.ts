import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function run() {
  const routeSource = read("app/api/app/admin/clients/[tenantId]/policy/route.ts");
  assert.match(routeSource, /resolveOpturonAdminActorId/);
  assert.match(routeSource, /getAdminTenantPolicy\(tenantId,\s*\{\s*actorUserId\s*\}\)/);
  assert.match(routeSource, /patchAdminTenantPolicy\(tenantId,\s*payload \|\| \{\},\s*\{\s*actorUserId\s*\}\)/);
  assert.match(routeSource, /opturon_admin_actor_unavailable/);

  const shellSource = read("components/layout/app-shell.tsx");
  assert.match(shellSource, /if \(!pathname\.startsWith\("\/app\/inventory"\)\) return;/);

  console.log("admin-client-policy-route-ui.test.ts: ok");
}

run();
