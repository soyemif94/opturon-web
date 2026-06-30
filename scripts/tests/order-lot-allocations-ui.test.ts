import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const hub = read("components/app/orders-hub.tsx");
const api = read("lib/api.ts");

assert.match(hub, /Lotes utilizados/);
assert.match(hub, /selectedOrder\?\.lotAllocations\?\.length/);
assert.match(hub, /allocation\.lotNumber \|\| "Lote sin numero"/);
assert.match(hub, /allocation\.quantity\} unidades/);
assert.match(hub, /allocation\.status/);
assert.match(hub, /Cancelar pedido/);
assert.match(hub, /\/api\/app\/orders\/\$\{encodeURIComponent\(order\.id\)\}\/status/);
assert.match(hub, /orderStatus: "cancelled"/);
assert.match(hub, /selectedOrder\.orderStatus !== "cancelled"/);
assert.match(api, /lotAllocations\?: PortalOrderLotAllocation\[\]/);

console.log("order-lot-allocations-ui.test.ts passed");
