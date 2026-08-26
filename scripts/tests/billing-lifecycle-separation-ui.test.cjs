const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.join(__dirname, "../../components/app/AdminClientConfiguration.tsx"),
  "utf8"
);

test("client lifecycle and billing use separate labels", () => {
  assert.match(source, /Cliente: \{formatClientLifecycleStatus\(tenant\.lifecycle\?\.status\)\}/);
  assert.match(source, /label="Estado del cliente"/);
  assert.match(source, /Estado de facturación/);
  assert.match(source, /formatBillingStatus\(currentSubscription\.localStatus\)/);
});

test("canceled billing is not presented as a suspended client", () => {
  assert.match(source, /canceled[\s\S]*Suscripción cancelada/);
  const lifecycleFormatter = source.slice(
    source.indexOf("function formatClientLifecycleStatus"),
    source.indexOf("function formatBillingStatus")
  );
  assert.doesNotMatch(lifecycleFormatter, /billing|subscription/i);
});

test("friendly client lifecycle labels cover active and suspended", () => {
  assert.match(source, /normalized === "active"[\s\S]*return "Activo"/);
  assert.match(source, /normalized === "suspended"[\s\S]*return "Suspendido"/);
});
