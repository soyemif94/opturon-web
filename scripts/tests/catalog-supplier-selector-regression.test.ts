import assert from "node:assert/strict";
import {
  buildProductSupplierOptions,
  normalizeProductSupplierOptions,
  resolveProductSupplierLabel
} from "../../components/app/product-supplier-select.helpers.ts";

const suppliers = normalizeProductSupplierOptions([
  {
    id: "active-1",
    legalName: "Proveedor QA D4",
    tradeName: "Distribuidora QA",
    status: "active"
  },
  {
    id: "inactive-1",
    legalName: "Proveedor Inactivo",
    tradeName: "Distribuidora Inactiva",
    status: "inactive"
  },
  {
    id: "cross-tenant",
    legalName: "",
    tradeName: "",
    status: "active"
  }
]);

assert.equal(suppliers.length, 2);
assert.equal(resolveProductSupplierLabel(suppliers[0]), "Distribuidora QA");
assert.equal(resolveProductSupplierLabel(suppliers[1]), "Distribuidora Inactiva");

const newAssociationOptions = buildProductSupplierOptions(suppliers, "", null, null);
assert.deepEqual(
  newAssociationOptions.map((supplier) => supplier.id),
  ["active-1"]
);

const inactiveSelectedOptions = buildProductSupplierOptions(suppliers, "inactive-1", "Distribuidora Inactiva", "inactive");
assert.deepEqual(
  inactiveSelectedOptions.map((supplier) => supplier.id),
  ["inactive-1", "active-1"]
);

const legacySelectedOptions = buildProductSupplierOptions(suppliers, "legacy-1", "Proveedor historico", "inactive");
assert.deepEqual(
  legacySelectedOptions.map((supplier) => supplier.id),
  ["legacy-1", "active-1"]
);
assert.equal(resolveProductSupplierLabel(legacySelectedOptions[0]), "Proveedor historico");

console.log("catalog-supplier-selector-regression.test.ts passed");
