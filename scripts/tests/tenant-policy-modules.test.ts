const assert = require("node:assert/strict");
const { buildTenantAppModules } = require("../../lib/tenant-policy.ts");
const { canAccessAppModule } = require("../../lib/app-permissions.ts");

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

function testOwnerSeesAllGrantedImplementedModules() {
  const modules = buildTenantAppModules({
    policyVersion: 1,
    planCode: "basic",
    limits: {
      maxPortalUsers: 5,
      maxAutomations: 20,
      maxContacts: 1000
    },
    operatingProfile: {
      presetKey: "custom",
      industryProfile: "custom",
      operatingModel: "hybrid"
    },
    recommendedCapabilities: [],
    capabilities: ["inbox", "contacts", "catalog", "orders", "receipts", "payments", "cash_management", "sales_pipeline", "appointments", "loyalty", "metrics"],
    enabledModules: {
      inbox: true,
      contacts: true,
      catalog: true,
      orders: true,
      invoices: true,
      payments: true,
      cash: true,
      sales: true,
      agenda: true,
      loyalty: true,
      automations: false,
      metrics: true
    }
  });

  const context = {
    accountScope: "client",
    tenantRole: "owner",
    tenantModules: modules
  };

  assert.equal(canAccessAppModule(context, "inbox"), true);
  assert.equal(canAccessAppModule(context, "contacts"), true);
  assert.equal(canAccessAppModule(context, "catalog"), true);
  assert.equal(canAccessAppModule(context, "orders"), true);
  assert.equal(canAccessAppModule(context, "invoices"), true);
  assert.equal(canAccessAppModule(context, "payments"), true);
  assert.equal(canAccessAppModule(context, "cash"), true);
  assert.equal(canAccessAppModule(context, "sales"), true);
  assert.equal(canAccessAppModule(context, "agenda"), true);
  assert.equal(canAccessAppModule(context, "loyalty"), true);
  assert.equal(canAccessAppModule(context, "metrics"), true);
  assert.equal(canAccessAppModule(context, "automations"), false);
}

async function run() {
  testLegacyTenantKeepsPreviousNavigation();
  testExplicitPolicyRestrictsImplementedModulesOnly();
  testFutureCapabilitiesDoNotCreateMenuItems();
  testOwnerSeesAllGrantedImplementedModules();
  console.log("tenant-policy-modules.test.ts: ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
