import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

function run() {
  const api = read("lib/api.ts");
  const helper = read("lib/admin-qa-inventory-proxy.ts");
  const productRoute = read("app/api/app/admin/clients/[tenantId]/inventory/qa/products/route.ts");
  const locationRoute = read("app/api/app/admin/clients/[tenantId]/inventory/qa/locations/route.ts");
  const lotRoute = read("app/api/app/admin/clients/[tenantId]/inventory/qa/lots/route.ts");
  const rollbackRoute = read("app/api/app/admin/clients/[tenantId]/inventory/qa/lots/[lotId]/rollback/route.ts");

  // The browser reaches only a fixed, server-side Admin workspace route. The
  // selected tenant and actor travel solely in headers set by the proxy helper.
  assert.match(api, /export async function requestAdminTenantQaInventory/);
  assert.match(api, /type AdminQaInventoryOperation = "productCreate" \| "locationCreate" \| "lotCreate" \| "lotRollback"/);
  assert.match(api, /function adminQaInventoryPath\(operation: AdminQaInventoryOperation/);
  assert.match(api, /case "productCreate":\s+return "\/products"/);
  assert.match(api, /case "locationCreate":\s+return "\/locations"/);
  assert.match(api, /case "lotCreate":\s+return "\/lots"/);
  assert.match(api, /\/admin-qa-inventory\$\{safePath\}/);
  assert.match(api, /"x-portal-actor-id": safeActorUserId/);
  assert.match(api, /"x-active-tenant-id": safeTargetTenantId/);
  assert.match(api, /backendPortalFetch<T>/);
  assert.match(helper, /requireOpturonAdminApi\(\)/);
  assert.match(helper, /resolveOpturonAdminActorId\(guard\.ctx\)/);
  assert.match(helper, /TENANT_ID_PATTERN/);
  assert.match(helper, /UUID_PATTERN/);
  assert.match(helper, /hasNoQuery\(request\)/);
  assert.doesNotMatch(helper, /request\.headers|headers\.get\(/);

  // The API is a narrow QA setup surface: product/location/rollback bodies
  // are empty and lot creation admits only the two tenant-scoped UUIDs. The
  // backend owns names, metadata, quantity, expiry, rollback details, and
  // idempotency; no arbitrary inventory action is reachable here.
  assert.match(helper, /const EMPTY_BODY_KEYS = new Set<string>\(\)/);
  assert.match(helper, /LOT_KEYS = new Set\(\["productId", "locationId"\]\)/);
  assert.match(helper, /hasOnlyKeys\(payload, EMPTY_BODY_KEYS\)/);
  assert.match(helper, /isUuid\(payload\.productId\)/);
  assert.match(helper, /isUuid\(payload\.locationId\)/);
  assert.match(helper, /request\.method\.toUpperCase\(\) !== "POST"/);
  assert.doesNotMatch(helper, /const (PRODUCT|LOCATION|ROLLBACK)_KEYS/);
  assert.doesNotMatch(helper, /payload\.(lotNumber|idempotencyKey|metadata|reason)/);
  assert.doesNotMatch(helper, /operational-alerts|whatsapp|graph\.facebook\.com|graph\.instagram\.com/i);

  assert.match(productRoute, /"productCreate"/);
  assert.match(locationRoute, /"locationCreate"/);
  assert.match(lotRoute, /"lotCreate"/);
  assert.match(rollbackRoute, /"lotRollback"/);
  for (const route of [productRoute, locationRoute, lotRoute, rollbackRoute]) {
    assert.match(route, /export async function POST/);
    assert.match(route, /proxyAdminTenantQaInventory/);
  }

  console.log("admin-qa-inventory-proxy.test.ts: ok");
}

run();
