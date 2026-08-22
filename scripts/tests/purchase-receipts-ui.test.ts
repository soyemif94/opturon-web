import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildInitialPurchaseReceiptDraft,
  ensurePurchaseReceiptAttemptKey,
  validatePurchaseReceiptDraft
} from "../../components/app/purchase-receipt-form.helpers.ts";
import { parsePurchaseReceiptsListQuery } from "../../app/api/app/purchase-receipts/query.ts";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const nav = read("components/app/InventorySectionNav.tsx");
const navigation = read("components/app/inventory-navigation.ts");
const listPage = read("app/app/inventory/receipts/page.tsx");
const newPage = read("app/app/inventory/receipts/new/page.tsx");
const detailPage = read("app/app/inventory/receipts/[receiptId]/page.tsx");
const workspace = read("components/app/PurchaseReceiptsWorkspace.tsx");
const form = read("components/app/PurchaseReceiptForm.tsx");
const detail = read("components/app/PurchaseReceiptDetail.tsx");
const listRoute = read("app/api/app/purchase-receipts/route.ts");
const detailRoute = read("app/api/app/purchase-receipts/[receiptId]/route.ts");

assert.match(navigation, /Recepciones/);
assert.match(navigation, /Ingresar mercaderia/);
assert.match(nav, /inventoryNavigationItems/);

assert.match(listPage, /PurchaseReceiptsWorkspace/);
assert.match(newPage, /PurchaseReceiptForm/);
assert.match(detailPage, /PurchaseReceiptDetail/);

assert.match(workspace, /Todavia no hay recepciones registradas/);
assert.match(workspace, /Ingresar mercaderia/);
assert.match(workspace, /Ver detalle/);
assert.match(form, /Confirmar ingreso/);
assert.match(form, /Legacy rechaza lote y vencimiento/);
assert.match(detail, /Recepcion confirmada/);
assert.doesNotMatch(detail, /Eliminar/);
assert.doesNotMatch(detail, /Revertir/);

assert.match(listRoute, /requireAppModuleApi\("inventory"/);
assert.match(listRoute, /manage_inventory_receipts/);
assert.match(listRoute, /createPortalPurchaseReceipt/);
assert.match(listRoute, /status: result\.data\.idempotent \? 200 : 201/);
assert.doesNotMatch(listRoute, /x-portal-key/);
assert.match(detailRoute, /getPortalPurchaseReceiptDetail/);

const queryOk = parsePurchaseReceiptsListQuery(new URL("https://www.opturon.test/api/app/purchase-receipts?page=2&pageSize=20&sort=receivedAt_desc&dateFrom=2026-07-01&dateTo=2026-07-29").searchParams);
assert.equal(queryOk.ok, true);
if (queryOk.ok) {
  assert.equal(queryOk.options.page, 2);
  assert.equal(queryOk.options.pageSize, 20);
}
assert.equal(parsePurchaseReceiptsListQuery(new URL("https://www.opturon.test/api/app/purchase-receipts?pageSize=101").searchParams).ok, false);
assert.equal(parsePurchaseReceiptsListQuery(new URL("https://www.opturon.test/api/app/purchase-receipts?sort=desc").searchParams).ok, false);
assert.equal(parsePurchaseReceiptsListQuery(new URL("https://www.opturon.test/api/app/purchase-receipts?dateFrom=2026-07-30&dateTo=2026-07-29").searchParams).ok, false);

const suppliers = [{ id: "sup-1", displayName: "Distribuidora QA", legalName: "Distribuidora QA", status: "active" as const }];
const locations = [{ id: "loc-1", name: "Principal", code: "main", isPrimary: true, active: true, tenantId: "tenant", createdAt: "", updatedAt: "", type: "main" as const }];
const products = [
  { id: "prod-legacy", name: "Legacy", status: "active", price: 10, currency: "ARS", stock: 0, clinicId: "tenant", description: null, sku: null, inventoryTrackingMode: "legacy" as const, createdAt: "", updatedAt: "" },
  { id: "prod-lot", name: "Loteado", status: "active", price: 10, currency: "ARS", stock: 0, clinicId: "tenant", description: null, sku: null, inventoryTrackingMode: "lot_based" as const, createdAt: "", updatedAt: "" }
];

const draft = buildInitialPurchaseReceiptDraft({ supplierId: "sup-1", locationId: "loc-1", receivedAt: "2026-07-29" });
assert.equal(ensurePurchaseReceiptAttemptKey("existing-key"), "existing-key");
assert.ok(draft.idempotencyKey.length > 10);

const valid = validatePurchaseReceiptDraft(
  {
    ...draft,
    lines: [
      {
        key: "l1",
        productId: "prod-legacy",
        quantity: "2",
        unitCost: "10.5000",
        lotNumber: "",
        expiresAt: ""
      },
      {
        key: "l2",
        productId: "prod-lot",
        quantity: "1.250",
        unitCost: "7.2500",
        lotNumber: " lote-1 ",
        expiresAt: "2026-08-10"
      }
    ]
  },
  { products, suppliers, locations, todayISO: "2026-07-29" }
);
assert.equal(valid.payload?.items.length, 2);
assert.equal(valid.payload?.items[0]?.lotNumber, undefined);
assert.equal(valid.payload?.items[1]?.lotNumber, "lote-1");
assert.equal(valid.payload?.items[1]?.expiresAt, "2026-08-10");

const lotPrecision = validatePurchaseReceiptDraft(
  {
    ...draft,
    lines: [{ key: "l1", productId: "prod-lot", quantity: "1.2345", unitCost: "", lotNumber: "LOT-1", expiresAt: "2026-08-10" }]
  },
  { products, suppliers, locations, todayISO: "2026-07-29" }
);
assert.equal(lotPrecision.payload, null);
assert.match(String(lotPrecision.fieldErrors["lines.0.quantity"] || ""), /3 decimales/);

const costPrecision = validatePurchaseReceiptDraft(
  {
    ...draft,
    lines: [{ key: "l1", productId: "prod-lot", quantity: "1.234", unitCost: "2.12345", lotNumber: "LOT-1", expiresAt: "2026-08-10" }]
  },
  { products, suppliers, locations, todayISO: "2026-07-29" }
);
assert.equal(costPrecision.payload, null);
assert.match(String(costPrecision.fieldErrors["lines.0.unitCost"] || ""), /4 decimales/);

const legacyDecimal = validatePurchaseReceiptDraft(
  {
    ...draft,
    lines: [{ key: "l1", productId: "prod-legacy", quantity: "1.5", unitCost: "", lotNumber: "", expiresAt: "" }]
  },
  { products, suppliers, locations, todayISO: "2026-07-29" }
);
assert.equal(legacyDecimal.payload, null);
assert.match(String(legacyDecimal.fieldErrors["lines.0.quantity"] || ""), /enteras/);

const legacyLot = validatePurchaseReceiptDraft(
  {
    ...draft,
    lines: [{ key: "l1", productId: "prod-legacy", quantity: "1", unitCost: "", lotNumber: "LOT-1", expiresAt: "2026-08-10" }]
  },
  { products, suppliers, locations, todayISO: "2026-07-29" }
);
assert.equal(legacyLot.payload, null);
assert.match(String(legacyLot.fieldErrors["lines.0.lotNumber"] || ""), /legacy/);

const lotMissing = validatePurchaseReceiptDraft(
  {
    ...draft,
    lines: [{ key: "l1", productId: "prod-lot", quantity: "1.5", unitCost: "", lotNumber: "", expiresAt: "" }]
  },
  { products, suppliers, locations, todayISO: "2026-07-29" }
);
assert.equal(lotMissing.payload, null);
assert.match(String(lotMissing.fieldErrors["lines.0.lotNumber"] || ""), /obligatorio/);

const expiredLot = validatePurchaseReceiptDraft(
  {
    ...draft,
    lines: [{ key: "l1", productId: "prod-lot", quantity: "1.5", unitCost: "", lotNumber: "LOT-1", expiresAt: "2026-07-01" }]
  },
  { products, suppliers, locations, todayISO: "2026-07-29" }
);
assert.equal(expiredLot.payload, null);
assert.match(String(expiredLot.fieldErrors["lines.0.expiresAt"] || ""), /paso/);

const duplicateLine = validatePurchaseReceiptDraft(
  {
    ...draft,
    lines: [
      { key: "l1", productId: "prod-lot", quantity: "1.5", unitCost: "", lotNumber: "LOT-1", expiresAt: "2026-08-10" },
      { key: "l2", productId: "prod-lot", quantity: "2.5", unitCost: "", lotNumber: "LOT-1", expiresAt: "2026-08-10" }
    ]
  },
  { products, suppliers, locations, todayISO: "2026-07-29" }
);
assert.equal(duplicateLine.payload, null);
assert.match(String(duplicateLine.fieldErrors["lines.1.productId"] || ""), /misma combinacion/);

console.log("purchase-receipts-ui.test.ts passed");
