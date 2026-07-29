import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const manager = read("components/app/CatalogManager.tsx");

assert.match(manager, /const \[workspaceMode, setWorkspaceMode\] = useState<"closed" \| "single" \| "bulk">/);
assert.match(manager, /const renderCatalogEditorWorkspace = \(\) =>/);
assert.match(manager, /id="catalog-workspace"/);
assert.match(manager, /openWorkspaceForCreate\(categoryFilter \|\| null\)/);
assert.match(manager, /openWorkspaceForBulkImport/);
assert.match(manager, /Workspace principal/);
assert.match(manager, /Las tareas largas viven en la banda ancha superior/);
assert.match(manager, /renderCatalogEditorWorkspace\(\)/);
assert.match(manager, /scrollToSection\("catalog-workspace"\)/);
assert.match(manager, /<Link href=\{`\/app\/catalog\/\$\{product\.id\}\/edit`\}>/);
assert.match(manager, /<Link href=\{`\/app\/catalog\/\$\{selectedProduct\.id\}\/edit`\}>/);
assert.doesNotMatch(manager, /function openEditWorkspace/);
assert.doesNotMatch(manager, /async function updateProduct/);
assert.doesNotMatch(manager, /\{false \? \(/);
assert.doesNotMatch(manager, /workspaceMode === "edit"/);

console.log("catalog-workspace-layout.test.ts passed");
