import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("app/app/page.tsx", "utf8");
const dashboard = fs.readFileSync("components/app/app-dashboard.tsx", "utf8");

test("dashboard passes durable AI provisioning state to the client surface", () => {
  assert.match(page, /aiProvisioning = contextResult\.data\.aiProvisioning/);
  assert.match(page, /aiProvisioning=\{aiProvisioning\}/);
  assert.match(dashboard, /aiProvisioning\?\.status === "pending"/);
  assert.match(dashboard, /24 y 48 horas/);
});
