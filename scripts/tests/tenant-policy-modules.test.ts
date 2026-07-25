const assert = require("node:assert/strict");
const { buildTenantAppModules } = require("../../lib/tenant-policy.ts");

function testLegacyTenantKeepsPreviousNavigation() {
  const modules = buildTenantAppModules(null);
  assert.equal(modules.inbox, true);
  assert.equal(modules.orders, true);
  assert.equal(modules.settings, true);
}

function testExplicitPolicyRestrictsImplementedModulesOnly() {
  const modules = buildTenantAppModules({
    policyVersion: 1,
    planCode: "basic",
    limits: {
      maxPortalUsers: 5,
      maxAutomations: 20,
      maxContacts: 1000
    },
    operatingProfile: {
      presetKey: "appointment_services",
      industryProfile: "appointment_services",
      operatingModel: "services"
    },
    recommendedCapabilities: ["contacts", "appointments", "payments"],
    capabilities: ["contacts", "appointments", "payments"],
    enabledModules: {
      contacts: true,
      agenda: true,
      payments: true,
      orders: false
    }
  });

  assert.equal(modules.contacts, true);
  assert.equal(modules.agenda, true);
  assert.equal(modules.orders, false);
  assert.equal(modules.settings, true);
}

function testFutureCapabilitiesDoNotCreateMenuItems() {
  const modules = buildTenantAppModules({
    policyVersion: 1,
    planCode: "basic",
    limits: {
      maxPortalUsers: 5,
      maxAutomations: 20,
      maxContacts: 1000
    },
    operatingProfile: {
      presetKey: "wholesale_distribution",
      industryProfile: "wholesale_distribution",
      operatingModel: "physical_goods"
    },
    recommendedCapabilities: ["inventory", "suppliers"],
    capabilities: ["inventory", "suppliers"],
    enabledModules: {}
  });

  assert.equal(Object.prototype.hasOwnProperty.call(modules, "suppliers"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(modules, "inventory_lots"), false);
  assert.equal(modules.inventory, true);
}

async function run() {
  testLegacyTenantKeepsPreviousNavigation();
  testExplicitPolicyRestrictsImplementedModulesOnly();
  testFutureCapabilitiesDoNotCreateMenuItems();
  console.log("tenant-policy-modules.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
