import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";

const root = process.cwd();
const { createOpsReportXlsx } = await import(pathToFileURL(join(root, "lib/ops/report-xlsx.ts")).href);

const salesColumns = [
  { header: "Fecha", key: "date", kind: "date" },
  { header: "Operación", key: "operation" },
  { header: "Vendedor", key: "seller" },
  { header: "Cliente", key: "customer", wrapText: true },
  { header: "Estado", key: "status" },
  { header: "Estado de cobro", key: "payment" },
  { header: "Canal", key: "channel" },
  { header: "Importe", key: "amount", kind: "currency" },
  { header: "Moneda", key: "currency" },
  { header: "Productos", key: "products", wrapText: true }
];
const salesRow = {
  date: "2026-10-10T15:30:00.000Z",
  operation: "order-123",
  seller: "SMOKE FEFO UI Seller...",
  customer: "=HYPERLINK(\"https://bad.invalid\")",
  status: "Abierta",
  payment: "Cobrado",
  channel: "Manual",
  amount: 485799.95999999996,
  currency: "ARS",
  products: "Producto: café, té; yerba\nIncluye \"muestra\""
};

const reportFixtures = [
  { title: "Opturon — Informe de Ventas", columns: salesColumns, rows: [salesRow] },
  { title: "Opturon — Rendimiento por Vendedor", columns: [
    { header: "Vendedor", key: "seller" }, { header: "Leads activos", key: "leads", kind: "number" },
    { header: "Operaciones cobradas", key: "paid", kind: "number" }, { header: "Importe cobrado", key: "revenue", kind: "currency" }, { header: "Moneda", key: "currency" }
  ], rows: [{ seller: "SMOKE FEFO UI Seller...", leads: 3, paid: 2, revenue: 485799.95999999996, currency: "ARS" }] },
  { title: "Opturon — Actividad y Seguimientos", columns: [
    { header: "Cliente", key: "customer" }, { header: "Vendedor", key: "seller" }, { header: "Etapa", key: "stage" },
    { header: "Canal", key: "channel" }, { header: "Próximo seguimiento", key: "next", kind: "date" }, { header: "Cumplimiento", key: "state" },
    { header: "Última actividad", key: "last", kind: "date" }
  ], rows: [{ customer: "José Núñez", seller: "Ana Pérez", stage: "Seguimiento", channel: "WhatsApp", next: "2026-10-11T15:30:00.000Z", state: "Próximo", last: "2026-10-10T15:30:00.000Z" }] },
  { title: "Opturon — Inventario Actual", columns: [
    { header: "SKU", key: "sku" }, { header: "Producto", key: "product" }, { header: "Categoría", key: "category" },
    { header: "Stock", key: "stock", kind: "number" }, { header: "Estado", key: "state" }, { header: "Ubicación", key: "location" },
    { header: "Último movimiento", key: "last", kind: "date" }
  ], rows: [{ sku: "CAF-1", product: "Café", category: "Bebidas", stock: 12, state: "Con stock", location: "Depósito", last: "2026-10-10T15:30:00.000Z" }] },
  { title: "Opturon — Movimientos de Inventario", columns: [
    { header: "Fecha", key: "date", kind: "date" }, { header: "Tipo", key: "type" }, { header: "SKU", key: "sku" },
    { header: "Producto", key: "product" }, { header: "Cantidad", key: "quantity", kind: "number" }, { header: "Motivo", key: "reason" },
    { header: "Usuario", key: "actor" }, { header: "Depósito", key: "location" }
  ], rows: [{ date: "2026-10-10T15:30:00.000Z", type: "Venta", sku: "CAF-1", product: "Café", quantity: -2.5, reason: "Ajuste", actor: "Ana", location: "Depósito" }] },
  { title: "Opturon — Lotes y Vencimientos", columns: [
    { header: "Producto", key: "product" }, { header: "SKU", key: "sku" }, { header: "Lote", key: "lot" },
    { header: "Fecha de vencimiento", key: "expiry", kind: "dateOnly" }, { header: "Días restantes", key: "days", kind: "number" },
    { header: "Cantidad disponible", key: "quantity", kind: "number" }, { header: "Estado", key: "state" }
  ], rows: [{ product: "Yerba", sku: "YER-1", lot: "L-2026", expiry: "2026-10-30", days: 20, quantity: 8, state: "Próximo a vencer" }] }
];

for (const [index, fixture] of reportFixtures.entries()) {
  const buffer = await createOpsReportXlsx({
    ...fixture,
    period: "2026-10-01 al 2026-10-31",
    generatedAt: new Date("2026-10-10T15:30:00.000Z"),
    filters: [{ label: "Canal", value: "WhatsApp" }]
  });
  assert.ok(buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), `${fixture.title} is an actual ZIP-based XLSX`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet("Datos");
  assert.ok(worksheet, `${fixture.title} has a Datos worksheet`);
  assert.equal(worksheet.getRow(6).getCell(1).value, fixture.columns[0].header);
  assert.notEqual(worksheet.getRow(7).getCell(1).value, null);
  assert.match(worksheet.autoFilter, /^A6:/, "filter targets the human-readable header row");
  assert.equal(worksheet.views[0].state, "frozen");
  assert.equal(worksheet.views[0].ySplit, 6);
  assert.ok(worksheet.getColumn(1).width >= 12, "column widths are applied");
  assert.match(String(worksheet.getCell(2, 2).value), /2026-10/);
  assert.match(String(worksheet.getCell(3, 2).value), /Canal: WhatsApp/);
  if (index === 0) {
    const dateCell = worksheet.getRow(7).getCell(1);
    const amountCell = worksheet.getRow(7).getCell(8);
    const customerCell = worksheet.getRow(7).getCell(4);
    const productsCell = worksheet.getRow(7).getCell(10);
    assert.ok(dateCell.value instanceof Date);
    assert.equal(dateCell.numFmt, "dd/mm/yyyy hh:mm");
    assert.equal(dateCell.value.toISOString(), "2026-10-10T12:30:00.000Z", "UTC timestamp is presented as Argentina local wall time");
    assert.equal(typeof amountCell.value, "number");
    assert.equal(amountCell.numFmt, "#,##0.00;[Red]-#,##0.00");
    assert.equal(new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountCell.value), "485.799,96");
    assert.equal(customerCell.value, "'=HYPERLINK(\"https://bad.invalid\")", "formula-leading user text is stored as literal text");
    assert.equal(customerCell.type, ExcelJS.ValueType.String);
    assert.equal(customerCell.formula, undefined);
    assert.equal(productsCell.value, salesRow.products, "multiline UTF-8 punctuation remains in one cell");
    assert.equal(worksheet.rowCount, 7, "multiline content does not create extra data rows");
    assert.ok(worksheet.getRow(7).height >= 36);
    const details = workbook.getWorksheet("Detalle de productos");
    assert.equal(details, undefined, "the helper does not fabricate detail rows");
  }
  if (index === 1) {
    const revenueCell = worksheet.getRow(7).getCell(4);
    assert.equal(worksheet.getRow(7).getCell(1).value, "SMOKE FEFO UI Seller...");
    assert.equal(typeof revenueCell.value, "number");
    assert.equal(revenueCell.value, 485799.95999999996);
    assert.equal(revenueCell.numFmt, "#,##0.00;[Red]-#,##0.00");
    assert.equal(new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(revenueCell.value), "485.799,96");
  }
}

const detailWorkbook = await createOpsReportXlsx({
  title: "Opturon — Informe de Ventas", period: "Todos los períodos", filters: [], columns: salesColumns, rows: [salesRow],
  additionalSheets: [{ name: "Detalle de productos", columns: [{ header: "Operación", key: "operation" }, { header: "Producto", key: "product" }], rows: [{ operation: "order-123", product: salesRow.products }] }]
});
const detailsParsed = new ExcelJS.Workbook();
await detailsParsed.xlsx.load(detailWorkbook);
assert.ok(detailsParsed.getWorksheet("Detalle de productos"));

const emptyBuffer = await createOpsReportXlsx({ title: "Opturon — Informe vacío", period: "2026-10", filters: [], columns: salesColumns, rows: [] });
const emptyWorkbook = new ExcelJS.Workbook();
await emptyWorkbook.xlsx.load(emptyBuffer);
assert.equal(emptyWorkbook.getWorksheet("Datos").getCell(7, 1).value, "No hay datos para los filtros seleccionados.");

const route = readFileSync(join(root, "app/api/app/ops/reports/[report]/route.ts"), "utf8");
for (const report of ["sales", "sellers", "followups", "inventory", "movements", "expirations"]) {
  assert.match(route, new RegExp(`reportDownloadResponse\\(\\"${report}\\"`), `${report} is routed through the server-side workbook/CSV generator`);
}
assert.match(route, /hasOpsAccessCookie\(cookieStore\)/);
assert.match(route, /requireAppModuleApi\(requiredModule, \{ permission: "manage_workspace" \}\)/);
assert.match(route, /resolveAppTenant\(\{ permission: "manage_workspace" \}\)/);
assert.match(route, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
assert.match(route, /name: "Detalle de productos"/);

console.log("ops-report-xlsx.test.mjs passed: six report workbooks, typed values, formatting, filters, formula safety and empty data");
