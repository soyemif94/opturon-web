import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const nav = read("components/app/InventorySectionNav.tsx");
const lots = read("components/app/InventoryLotsWorkspace.tsx");
const surfaces = [
  "app/app/inventory/movements/page.tsx",
  "app/app/inventory/suppliers/page.tsx",
  "app/app/inventory/receipts/page.tsx",
  "app/app/inventory/receipts/new/page.tsx",
  "app/app/inventory/receipts/[receiptId]/page.tsx"
].map(read);

test("mobile uses a bounded native selector while tablet and desktop retain the rail", () => {
  assert.match(nav, /<select[\s\S]*?data-inventory-mobile-navigation/);
  assert.match(nav, /w-full min-w-0 max-w-full/);
  assert.match(nav, /md:hidden/);
  assert.match(nav, /md:block/);
  assert.match(nav, /visibleItems\.map/);
  assert.match(nav, /value=\{activeHref\}/);
});

test("expiration destination has a real scroll target", () => {
  assert.match(lots, /id="vencimientos"/);
  assert.match(lots, /scroll-mt-28/);
});

test("all routed inventory surfaces propagate sensitive navigation capability", () => {
  for (const source of surfaces) {
    assert.match(source, /canPerformTenantInventorySensitiveAction\(ctx\)/);
  }
});
