import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const page = read("app/app/inventory/bulk-adjust/page.tsx");
const inventoryPage = read("app/app/inventory/page.tsx");
const baseWorkspace = read("components/app/InventoryBaseWorkspace.tsx");
const workspace = read("components/app/InventoryBulkStockWorkspace.tsx");
const state = read("lib/inventory-bulk-stock.ts");
const permissions = read("lib/app-permissions.ts");

assert.match(page, /requireAppModulePage\("inventory", \{/);
assert.match(page, /permission: "manage_inventory_sensitive"/);
assert.match(page, /canPerformTenantInventorySensitiveAction\(ctx\)/);
assert.match(page, /redirect\("\/app\/inventory"\)/);
assert.match(page, /getPortalInventoryProducts\([\s\S]*?getPortalInventoryReadActor\(ctx\)/);
assert.match(page, /InventoryBulkStockWorkspace/);

assert.match(inventoryPage, /canBulkAdjust=\{Boolean\(ctx\.tenantId\) && canPerformTenantInventorySensitiveAction\(ctx\)\}/);
assert.match(permissions, /export function canPerformTenantInventorySensitiveAction/);
assert.match(permissions, /accountScope[\s\S]*?=== "opturon_admin"/);
assert.match(permissions, /tenantRole === "owner" \|\| tenantRole === "manager"/);
assert.match(baseWorkspace, /Carga inicial \/ Ajuste masivo/);
assert.match(baseWorkspace, /href="\/app\/inventory\/bulk-adjust"/);

for (const heading of ["Codigo / SKU", "Producto", "Stock actual", "Nueva cantidad", "Diferencia", "Estado"]) {
  assert(workspace.includes(heading), `bulk table must include ${heading}`);
}
assert.match(workspace, /overflow-x-auto/);
assert.match(workspace, /min-w-\[900px\]/);
assert.match(workspace, /data-bulk-stock-input="true"/);
assert.match(workspace, /event\.key !== "Enter"/);
assert.match(workspace, /event\.shiftKey \? currentIndex - 1 : currentIndex \+ 1/);
assert.match(workspace, /Solo modificados \(\{draftSummary\.draftItems\}\)/);
assert.match(workspace, /paginateBulkStockDrafts\(drafts, appliedFilters/);
assert.match(workspace, /setDrafts\(\(current\) => updateBulkStockDraft/);
const submitStart = workspace.indexOf("async function submitBulkAdjustment");
const submitCatchStart = workspace.indexOf("} catch (error) {", submitStart);
const submitFinallyStart = workspace.indexOf("} finally {", submitCatchStart);
assert.notEqual(submitStart, -1);
assert.notEqual(submitCatchStart, -1);
assert.notEqual(submitFinallyStart, -1);
assert.doesNotMatch(workspace.slice(submitCatchStart, submitFinallyStart), /setDrafts\(\{\}\)/, "failed submissions must preserve drafts");

for (const reason of ["initial_stock", "physical_count", "inventory_correction", "other"]) {
  assert(state.includes(`"${reason}"`), `stable reason ${reason} must exist`);
}
assert.match(workspace, /Revisar y aplicar ajustes/);
assert.match(workspace, /Confirmo que quiero aplicar ajustes de inventario/);
assert.match(workspace, /reviewItems\.length === 0/);
assert.match(workspace, /reason === "other" && !normalizedNote/);
assert.match(workspace, /submitInFlightRef\.current/);
assert.match(workspace, /buildBulkStockPayloadFingerprint/);
assert.match(workspace, /resolveBulkStockAttempt\(attempt, fingerprint\)/);
assert.match(workspace, /fetch\("\/api\/app\/inventory\/bulk-adjust"/);
assert.doesNotMatch(workspace, /reviewItems\.map\s*\([^)]*fetch/);
assert.match(workspace, /await loadProducts\(pagination\.page, appliedFilters\)/);
assert.match(workspace, /setDrafts\(\{\}\)/);
assert.match(workspace, /toast\.success\("Ajuste masivo aplicado"/);
assert.match(workspace, /setSubmitError\(message\)/);
assert.match(workspace, /Resultado sin confirmar/);
assert.match(workspace, /El ajuste puede haberse aplicado/);
assert.match(workspace, /Conservaremos la misma clave segura/);
assert.match(workspace, /isConfirmedBulkStockRejection/);
assert.match(workspace, /Gestionado por lotes/);
assert.match(workspace, /MAX_BULK_STOCK_QUANTITY/);
assert.match(workspace, /MAX_BULK_STOCK_ITEMS/);
assert.match(workspace, /reviewItems\.length > MAX_BULK_STOCK_ITEMS/);
assert.match(workspace, /rebaseBulkStockConflict/);
assert.match(workspace, /conflicts\.reduce\(\(next, conflict\) => rebaseBulkStockConflict/);
assert.match(workspace, /Stock actualizado/);
assert.match(workspace, /isSemanticallyValidBulkStockResult\(json, reviewItems\)/);
assert.match(workspace, /resolveInventoryPageCorrection\(nextPage, json\.pagination\.totalPages\)/);
assert.match(workspace, /loadProducts\(correctionPage, normalizedFilters, false\)/);
assert.match(workspace, /beforeunload/);
assert.match(workspace, /document\.addEventListener\("click", guardClientNavigation, true\)/);
assert.match(workspace, /navigation\.addEventListener\("navigate", guardHistoryNavigation\)/);
assert.match(workspace, /if \(draftSummary\.draftItems === 0\) return;/);
assert.doesNotMatch(workspace, /history\.pushState/);
assert.match(workspace, /event\.preventDefault\(\);[\s\S]*?if \(saving\) return;/);
assert.match(workspace, /maxLength=\{500\}/);
assert.match(workspace, /aria-describedby=/);
assert.match(workspace, /aria-label="Filtrar por estado de stock"/);
assert.match(workspace, /navigationBypassRef\.current = true;[\s\S]*?router\.push\(pendingExitHref\)/);

console.log("inventory-bulk-stock-ui.test.ts passed");
