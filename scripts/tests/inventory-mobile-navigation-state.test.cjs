const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

const source = readFileSync("components/app/inventory-navigation.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleUnderTest = { exports: {} };
new Function("exports", "module", "require", compiled)(moduleUnderTest.exports, moduleUnderTest, require);

const {
  INVENTORY_NAVIGATION_ITEMS,
  inventoryNavigationItems,
  resolveInventoryNavigationHref
} = moduleUnderTest.exports;

test("mobile inventory navigation exposes every permitted destination in stable order", () => {
  assert.deepEqual(
    inventoryNavigationItems(false).map((item) => item.label),
    ["Resumen", "Movimientos", "Lotes", "Proveedores", "Recepciones", "Vencimientos", "Ingresar mercaderia"]
  );
  assert.equal(inventoryNavigationItems(true).length, 8);
  assert.equal(INVENTORY_NAVIGATION_ITEMS.at(-1)?.capability, "manage_inventory_sensitive");
  assert.equal(inventoryNavigationItems(false).some((item) => item.label === "Carga masiva"), false);
});

test("every inventory surface resolves to exactly one visible active destination", () => {
  const cases = [
    ["/app/inventory", "", "/app/inventory"],
    ["/app/inventory", "#lotes", "/app/inventory#lotes"],
    ["/app/inventory", "vencimientos", "/app/inventory#vencimientos"],
    ["/app/inventory/movements", "", "/app/inventory/movements"],
    ["/app/inventory/suppliers", "", "/app/inventory/suppliers"],
    ["/app/inventory/receipts", "", "/app/inventory/receipts"],
    ["/app/inventory/receipts/new", "", "/app/inventory/receipts/new"],
    ["/app/inventory/receipts/receipt-1", "", "/app/inventory/receipts"],
    ["/app/inventory/bulk-adjust", "", "/app/inventory/bulk-adjust"]
  ];

  for (const [pathname, hash, expected] of cases) {
    const active = resolveInventoryNavigationHref(pathname, hash, true);
    assert.equal(active, expected);
    assert.equal(inventoryNavigationItems(true).filter((item) => item.href === active).length, 1);
  }
});

test("sensitive destination cannot become active when capability is absent", () => {
  assert.equal(resolveInventoryNavigationHref("/app/inventory/bulk-adjust", "", false), "/app/inventory");
});
