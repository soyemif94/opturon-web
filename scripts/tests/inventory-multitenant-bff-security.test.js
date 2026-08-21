const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const apiSource = fs.readFileSync(path.join(root, "lib/api.ts"), "utf8");
const accessSource = fs.readFileSync(path.join(root, "lib/saas/access.ts"), "utf8");

assert.match(apiSource, /headers\.set\("x-portal-key", portalKey\)/, "BFF must authenticate to the portal backend");
assert.match(apiSource, /if \(!actorId\) throw new Error\("portal_inventory_read_actor_required"\)/, "inventory proxy must fail closed without an actor");
assert.match(apiSource, /headers\.set\("x-portal-actor-id", actorId\)/, "inventory proxy must send canonical actor identity");
assert.match(apiSource, /headers\.set\("x-portal-actor-global-role", actor\.globalRole\)/, "admin role must be explicit");
assert.match(accessSource, /id: String\(ctx\.portalActorId \|\| ctx\.session\?\.user\?\.portalActorId \|\| ctx\.userId/, "actor id must come from server session context");
assert.match(accessSource, /return \{ ctx, tenantId: ctx\.tenantId, readOnly: !canWrite \}/, "tenant must come from canonical session context");

const routeRoots = ["catalog", "suppliers", "purchase-receipts"];
const routeFiles = [];
function collectRoutes(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectRoutes(fullPath);
    else if (entry.name === "route.ts") routeFiles.push(fullPath);
  }
}
for (const routeRoot of routeRoots) collectRoutes(path.join(root, "app/api/app", routeRoot));

const inventoryBackends = /(?:get|create|patch|delete|preview|execute|download)Portal(?:Product|Supplier|PurchaseReceipt|Catalog)|\/products\/image-upload/;
let protectedRoutes = 0;
for (const routeFile of routeFiles) {
  const source = fs.readFileSync(routeFile, "utf8");
  if (!inventoryBackends.test(source)) continue;
  protectedRoutes += 1;
  assert.match(source, /resolveAppTenant\(/, `${routeFile} must resolve tenant server-side`);
  assert.match(source, /getPortalInventoryReadActor/, `${routeFile} must forward the canonical actor`);
  assert.doesNotMatch(source, /request\.nextUrl\.searchParams\.get\(["']tenantId["']\)/, `${routeFile} must ignore forged tenant query params`);
}
assert.ok(protectedRoutes >= 21, "expected the complete catalog/supplier/receipt BFF surface");

const uploadRoute = fs.readFileSync(path.join(root, "app/api/app/catalog/image-upload/route.ts"), "utf8");
assert.match(uploadRoute, /"x-portal-key": portalKey/);
assert.match(uploadRoute, /"x-portal-actor-id": actor\.id/);
assert.match(uploadRoute, /"x-portal-actor-global-role": actor\.globalRole/);

console.log(`inventory-multitenant-bff-security.test.js passed (${protectedRoutes} routes)`);
