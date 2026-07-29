import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const nav = read("components/app/InventorySectionNav.tsx");
const page = read("app/app/inventory/page.tsx");
const workspace = read("components/app/InventoryBaseWorkspace.tsx");

assert.match(nav, /href: "\/app\/inventory#movimientos", label: "Movimientos"/);
assert.match(nav, /href: "\/app\/inventory#lotes", label: "Lotes"/);
assert.match(nav, /href: "\/app\/inventory\/receipts", label: "Recepciones"/);
assert.match(nav, /href: "\/app\/inventory\/receipts\/new", label: "Ingresar mercaderia"/);

assert.match(page, /summarySectionId="resumen"/);
assert.match(page, /movementsSectionId="movimientos"/);
assert.match(page, /id="lotes"/);
assert.doesNotMatch(page, /<div id="movimientos"\s*\/>/);

assert.match(workspace, /summarySectionId\?: string/);
assert.match(workspace, /movementsSectionId\?: string/);
assert.match(workspace, /id=\{summarySectionId\}/);
assert.match(workspace, /id=\{movementsSectionId\}/);
assert.match(workspace, /scroll-mt-28/);
assert.match(workspace, /CardTitle>Stock actual</);

console.log("inventory-navigation-anchor-ui.test.ts passed");
