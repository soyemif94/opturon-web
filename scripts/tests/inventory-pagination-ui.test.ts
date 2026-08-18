import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const api = read("lib/api.ts");
const page = read("app/app/inventory/page.tsx");
const workspace = read("components/app/InventoryBaseWorkspace.tsx");
const productsRoute = read("app/api/app/inventory/products/route.ts");

const inventoryApiStart = api.indexOf("export async function getPortalInventoryProducts");
const inventoryApiEnd = api.indexOf("export async function getPortalInventoryMovements", inventoryApiStart);
assert.notEqual(inventoryApiStart, -1, "inventory products API helper must exist");
assert.notEqual(inventoryApiEnd, -1, "inventory products API helper must have a bounded source block");
const inventoryApi = api.slice(inventoryApiStart, inventoryApiEnd);

assert.match(api, /export type PortalInventoryPagination = \{[\s\S]*?page: number;[\s\S]*?pageSize: number;[\s\S]*?totalItems: number;[\s\S]*?totalPages: number;[\s\S]*?\};/);
assert.match(api, /export type PortalInventorySummary = \{[\s\S]*?totalProducts: number;[\s\S]*?withStock: number;[\s\S]*?withoutStock: number;[\s\S]*?\};/);
assert.match(inventoryApi, /page: number;/, "legacy page metadata must remain typed during rollout");
assert.match(inventoryApi, /pageSize: number;/, "legacy pageSize metadata must remain typed during rollout");
assert.match(inventoryApi, /total: number;/, "legacy total metadata must remain typed during rollout");
assert.match(inventoryApi, /pagination: PortalInventoryPagination;/);
assert.match(inventoryApi, /summary: PortalInventorySummary;/);

assert.match(page, /const INVENTORY_PAGE_SIZE = 50;/);
assert.match(page, /getPortalInventoryProducts\(ctx\.tenantId, \{ page: 1, pageSize: INVENTORY_PAGE_SIZE \}\)/);
assert.match(page, /pagination = productsResult\.data\.pagination;/);
assert.match(page, /summary = productsResult\.data\.summary;/);
assert.match(page, /initialPagination=\{pagination\}/);
assert.match(page, /initialSummary=\{summary\}/);

assert.match(productsRoute, /page: Number\(url\.searchParams\.get\("page"\) \|\| 1\)/);
assert.match(productsRoute, /pageSize: Number\(url\.searchParams\.get\("pageSize"\) \|\| 50\)/);
assert.match(productsRoute, /\.\.\.result\.data/);

assert.match(workspace, /const \[pagination, setPagination\] = useState\(initialPagination\)/);
assert.match(workspace, /const \[inventorySummary, setInventorySummary\] = useState\(initialSummary\)/);
assert.match(workspace, /page: String\(nextPage\)/);
assert.match(workspace, /pageSize: String\(INVENTORY_PAGE_SIZE\)/);
assert.match(workspace, /setProducts\(json\.products\);[\s\S]*?setPagination\(json\.pagination\);[\s\S]*?setInventorySummary\(json\.summary\);/);
assert.match(
  workspace,
  /json\.pagination\.totalPages > 0 && json\.pagination\.page > json\.pagination\.totalPages[\s\S]*?loadProducts\(json\.pagination\.totalPages, normalizedFilters\)/,
  "a filtered last page that shrinks after a movement must reload the new final page"
);
assert.match(workspace, /async function applyProductFilters\(\) \{[\s\S]*?loadProducts\(1, \{ search, stockFilter \}\)/);
assert.match(workspace, /async function refreshCurrentPage\(\) \{[\s\S]*?loadProducts\(pagination\.page, appliedFilters\)/);
assert.match(workspace, /await refreshCurrentPage\(\);/, "movement writes must refresh the visible server page");
assert.match(workspace, /loadProducts\(pagination\.page - 1, appliedFilters\)/);
assert.match(workspace, /loadProducts\(pagination\.page \+ 1, appliedFilters\)/);
assert.match(workspace, /const hasNextPage = pagination\.page < pagination\.totalPages;/);
assert.match(workspace, /Math\.min\(pagination\.totalItems, pagination\.page \* pagination\.pageSize\)/);

assert.match(workspace, /inventorySummary\.totalProducts/);
assert.match(workspace, /inventorySummary\.withStock/);
assert.match(workspace, /inventorySummary\.withoutStock/);
assert.doesNotMatch(workspace, /total:\s*products\.length/);
assert.doesNotMatch(workspace, /products\.length\s*-\s*withStock/);

assert.match(workspace, /aria-label="Paginacion de productos"/);
assert.match(workspace, /grid-cols-\[7rem_minmax\(16rem,1fr\)_7rem\]/);
assert.match(workspace, /min-w-\[36rem\]/);
assert.match(workspace, /className="w-28 shrink-0 justify-center"/);
assert.match(workspace, /tabular-nums/);
assert.doesNotMatch(workspace, /paginationItems/, "pagination layout must not change its number of controls by page");

const totalItems = 505;
const pageSize = 50;
const totalPages = Math.ceil(totalItems / pageSize);
assert.equal(totalPages, 11);
assert.equal((2 - 1) * pageSize + 1, 51, "page 2 must start at the next server slice");
assert.equal((totalPages - 1) * pageSize + 1, 501, "last page must start at item 501");
assert.equal(totalItems - (totalPages - 1) * pageSize, 5, "last page must contain five products");

console.log("inventory-pagination-ui.test.ts passed");
