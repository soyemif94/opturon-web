import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

function testAdminProxySupportsProcessing() {
  const proxy = read("lib/partners-admin-proxy.ts");
  assert.match(proxy, /"process"/);
  assert.match(proxy, /client-requests/);
}

function testAdminWorkspaceShowsProcessingAction() {
  const source = read("components/app/PartnersAdminWorkspace.tsx");
  assert.match(source, /Confirmar pago y procesar alta/);
  assert.match(source, /processClientRequest/);
  assert.match(source, /paymentConfirmed: true/);
  assert.match(source, /estimateClientActivationCommission/);
  assert.match(source, /processingStatus === "processed"/);
  assert.match(source, /Comision/);
}

testAdminProxySupportsProcessing();
testAdminWorkspaceShowsProcessingAction();
console.log("partner-client-activation-ui.test.ts: ok");
