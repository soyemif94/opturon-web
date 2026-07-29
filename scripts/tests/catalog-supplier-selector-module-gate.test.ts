import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTenantAppModules } from "../../lib/tenant-policy.ts";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const listRoute = read("app/api/app/suppliers/route.ts");
const detailRoute = read("app/api/app/suppliers/[supplierId]/route.ts");

const catalogOnlyModules = buildTenantAppModules({
  policyVersion: 1,
  planCode: "basic",
  limits: {
    maxPortalUsers: 5,
    maxAutomations: 20,
    maxContacts: 1000
  },
  operatingProfile: {
    presetKey: "retail_commerce",
    industryProfile: "retail_commerce",
    operatingModel: "physical_goods"
  },
  recommendedCapabilities: ["catalog"],
  capabilities: ["catalog"],
  enabledModules: {
    catalog: true,
    inventory: false
  }
});

assert.equal(catalogOnlyModules.catalog, true);
assert.equal(catalogOnlyModules.inventory, false);

assert.match(listRoute, /async function requireSuppliersReadModuleApi\(\)/);
assert.match(listRoute, /requireAppModuleApi\("inventory"\)/);
assert.match(listRoute, /return requireAppModuleApi\("catalog"\)/);
assert.match(listRoute, /const moduleGuard = await requireSuppliersReadModuleApi\(\)/);

assert.match(detailRoute, /async function requireSuppliersReadModuleApi\(\)/);
assert.match(detailRoute, /requireAppModuleApi\("inventory"\)/);
assert.match(detailRoute, /return requireAppModuleApi\("catalog"\)/);
assert.match(detailRoute, /const moduleGuard = await requireSuppliersReadModuleApi\(\)/);

console.log("catalog-supplier-selector-module-gate.test.ts passed");
