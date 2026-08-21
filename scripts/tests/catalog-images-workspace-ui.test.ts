import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const workspace = read("components/app/CatalogImagesWorkspace.tsx");
const page = read("app/app/catalog/images/page.tsx");
const bffList = read("app/api/app/catalog/images/route.ts");
const bffUpload = read("app/api/app/catalog/image-upload/route.ts");
const manager = read("components/app/CatalogManager.tsx");
const editor = read("components/app/ProductEditor.tsx");
const detail = read("app/app/catalog/[id]/page.tsx");
const api = read("lib/api.ts");
const helpers = read("lib/catalog-images.ts");

assert.match(page, /requireAppModulePage\("catalog"\)/);
assert.match(page, /getPortalProductImages/);
assert.match(page, /pageSize: CATALOG_IMAGE_PAGE_SIZE/);
assert.match(page, /Imágenes de productos/);
assert.match(bffList, /requireAppModuleApi\("catalog"/);
assert.match(bffList, /resolveAppTenant/);
assert.match(bffUpload, /permission: "manage_catalog"/);
assert.match(api, /backendPortalFetch<\{ success: boolean; data: PortalCatalogImageWorkspaceData \}>/);
assert.match(api, /return backendPortalFetch<\{ success: boolean; data: PortalProduct \}>\(/);

assert.match(workspace, /Con imagen/);
assert.match(workspace, /Sin imagen/);
assert.match(workspace, /Buscar por nombre, SKU o código interno/);
assert.match(workspace, /onDrop=\{handleDrop\}/);
assert.match(workspace, /files\.length !== 1/);
assert.match(workspace, /URL\.createObjectURL/);
assert.match(workspace, /phase === "uploading"/);
assert.match(workspace, /phase === "success"/);
assert.match(workspace, /phase === "error"/);
assert.match(workspace, /\/api\/app\/catalog\/image-upload/);
assert.match(workspace, /method: "PATCH"/);
assert.match(workspace, /setPreviewUrl\(null\)/);
assert.match(helpers, /La imagen anterior se conserva/);
assert.match(workspace, /object-contain/);
assert.match(workspace, /loading="lazy"/);
assert.match(workspace, />Sin imagen</);
assert.match(workspace, /grid-cols-\[repeat\(auto-fill/);
assert.match(workspace, /Página \{Math\.max\(page, 1\)\}/);

assert.match(manager, /importsHistoryOpen/);
assert.match(manager, /if \(!importsHistoryOpen\) return/);
assert.match(manager, /Historial de cargas/);
assert.match(manager, /href="\/app\/catalog\/images"/);
assert.match(manager, /object-contain/);
assert.match(editor, /object-contain/);
assert.match(detail, /object-contain/);
assert.doesNotMatch(manager, /\{recentImports\.length > 0 \? \(/);

console.log("catalog-images-workspace-ui.test.ts passed");
