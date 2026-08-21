import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const api = read("lib/api.ts");
const access = read("lib/saas/access.ts");
const readRoutes = [
  "app/api/app/inventory/products/route.ts",
  "app/api/app/inventory/movements/route.ts",
  "app/api/app/inventory/products/[productId]/movements/route.ts",
  "app/api/app/inventory/lots/route.ts",
  "app/api/app/inventory/lots/[lotId]/route.ts",
  "app/api/app/inventory/lots/[lotId]/history/route.ts",
  "app/api/app/inventory/locations/route.ts",
  "app/api/app/inventory/expiration-summary/route.ts",
  "app/api/app/inventory/expiration-settings/route.ts"
];

assert.match(api, /function portalActorHeaders\([\s\S]*?portal_inventory_read_actor_required/);
assert.match(api, /function portalInventoryReadFetch</);
assert.match(api, /headers\.set\("x-portal-actor-id", actorId\)/);
assert.match(api, /return backendPortalFetch<T>\(path, \{ headers \}\)/);
assert.match(access, /export function getPortalInventoryReadActor/);

for (const routePath of readRoutes) {
  const route = read(routePath);
  assert.match(route, /resolveAppTenant\(/, `${routePath} must resolve the server-authorized tenant`);
  assert.match(route, /getPortalInventoryReadActor\(tenantContext\.ctx \|\| \{\}\)/, `${routePath} must propagate authenticated actor identity`);
  assert.match(route, /tenantContext\.tenantId/, `${routePath} must use resolved tenant, never raw tenant input downstream`);
}

const productsRoute = read(readRoutes[0]);
const productMovementsRoute = read(readRoutes[2]);
const inventoryModeRoute = read("app/api/app/products/[productId]/inventory-mode/route.ts");
assert.match(productsRoute, /requestedTenantId: url\.searchParams\.get\("tenantId"\) \|\| undefined/);
assert.match(productsRoute, /getPortalInventoryProducts\(tenantContext\.tenantId/);
assert.doesNotMatch(productsRoute, /getPortalInventoryProducts\(url\.searchParams/);
assert.match(productMovementsRoute, /permission: "manage_inventory_sensitive"/);
assert.match(productMovementsRoute, /canPerformTenantInventorySensitiveAction\(moduleGuard\.ctx\)/);
assert.doesNotMatch(productMovementsRoute, /permission: "manage_catalog"/);
assert.match(inventoryModeRoute, /requireAppModuleApi\("inventory", \{ permission: "manage_inventory_sensitive" \}\)/);
assert.match(inventoryModeRoute, /canPerformTenantInventorySensitiveAction\(moduleGuard\.ctx\)/);
assert.match(inventoryModeRoute, /resolveAppTenant\(\{ permission: "manage_inventory_sensitive", requireWrite: true \}\)/);

console.log("inventory-read-security-ui.test.ts passed");
