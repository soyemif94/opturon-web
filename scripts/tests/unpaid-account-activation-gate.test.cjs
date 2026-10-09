const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("unpaid client access uses the canonical billing entitlement", () => {
  const access = read("lib/saas/access.ts");
  const layout = read("app/app/layout.tsx");

  assert.match(access, /getPortalSaasCheckoutStatus/);
  assert.match(access, /entitlementActive === true/);
  assert.match(access, /paid_entitlement_required/);
  assert.match(access, /paid_entitlement_unavailable/);
  assert.match(layout, /getPortalSaasCheckoutStatus/);
  assert.match(layout, /unpaidClient/);
  assert.match(layout, /contextEntitlements/);
});

test("unpaid clients receive an intentional activation screen and restricted navigation", () => {
  const shell = read("components/layout/app-shell.tsx");
  const layout = read("app/app/layout.tsx");

  assert.match(shell, /function UnpaidActivationScreen/);
  assert.match(shell, /tenantLabel \? `Hola \$\{tenantLabel\} 👋` : "Hola 👋"/);
  assert.match(shell, /Todavía no tenés un plan pago activo/);
  assert.match(shell, /Continuar contratación/);
  assert.match(shell, /Elegir un plan/);
  assert.match(shell, /unpaidGate \? item\.module === "home"/);
  assert.match(shell, /unpaidGate \? <UnpaidActivationScreen/);
  assert.match(layout, /safeBusinessDisplayName/);
  assert.match(layout, /tenantLabel=\{unpaidClient \? safeBusinessDisplayName : tenantLabel\}/);
});

test("unpaid header is activation-oriented while active header badges remain unchanged", () => {
  const shell = read("components/layout/app-shell.tsx");

  assert.match(shell, /unpaidGate \? "Activá tu cuenta para comenzar a usar Opturon"/);
  assert.match(shell, /!unpaidGate \? \(/);
  assert.match(shell, /Operacion en vivo/);
  assert.match(shell, /unpaidGate \? "Activación pendiente" : "Portal activo"/);
});

test("legacy active entitlements and internal portals remain outside the client gate", () => {
  const access = read("lib/saas/access.ts");
  const layout = read("app/app/layout.tsx");

  assert.match(access, /!isClientTenant/);
  assert.match(layout, /!isStaffRole\(ctx\.globalRole\)/);
  assert.match(layout, /isOpturonAdminWorkspaceContext/);
  assert.match(layout, /entitlementActive: String\(contextEntitlements\.state \|\| ""\)\.toLowerCase\(\) === "active"/);
});

test("registration remains separate from paid activation", () => {
  const register = read("components/auth/RegisterForm.tsx");
  const access = read("lib/saas/access.ts");

  assert.doesNotMatch(register, /entitlement|paidAccess|activate/i);
  assert.match(access, /paid_entitlement_required/);
});

test("no provider mutation is introduced by the activation gate", () => {
  const files = [
    "app/app/layout.tsx",
    "components/layout/app-shell.tsx",
    "lib/saas/access.ts"
  ].map(read).join("\n");

  assert.doesNotMatch(files, /PUT\s+\/preapproval|createCheckout|createPortalSaasCheckout|mercadopago/i);
});
