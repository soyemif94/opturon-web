import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildEnabledModulesFromCapabilities, getCapabilityForAppModule } from "../../lib/tenant-policy.ts";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function testCanonicalModuleCapabilityMapping() {
  assert.equal(getCapabilityForAppModule("invoices"), "receipts");
  assert.equal(getCapabilityForAppModule("cash"), "cash_management");
  assert.equal(getCapabilityForAppModule("sales"), "sales_pipeline");
  assert.equal(getCapabilityForAppModule("agenda"), "appointments");

  const enabled = buildEnabledModulesFromCapabilities([
    "receipts",
    "cash_management",
    "sales_pipeline",
    "appointments"
  ]);

  assert.equal(enabled.invoices, true);
  assert.equal(enabled.cash, true);
  assert.equal(enabled.sales, true);
  assert.equal(enabled.agenda, true);
  assert.equal(enabled.automations, false);
}

function testAdminClientConfigurationSyncsModuleAndCapabilityDrafts() {
  const source = read("components/app/AdminClientConfiguration.tsx");
  assert.match(source, /buildEnabledModulesFromCapabilities/);
  assert.match(source, /syncCapabilitiesForEnabledModule/);
  assert.match(source, /syncEnabledModulesForCapability/);
  assert.match(source, /capabilities:\s*syncCapabilitiesForEnabledModule\(draft\.capabilities,\s*moduleName,\s*event\.target\.checked\)/);
  assert.match(source, /enabledModules:\s*syncEnabledModulesForCapability\(draft\.enabledModules,\s*capability,\s*event\.target\.checked\)/);
}

async function run() {
  testCanonicalModuleCapabilityMapping();
  testAdminClientConfigurationSyncsModuleAndCapabilityDrafts();
  console.log("admin-client-module-capability-sync.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
