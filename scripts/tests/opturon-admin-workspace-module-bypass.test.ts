import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const rootDir = path.resolve(currentDir, "..", "..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function testAccessDefinesStaffOnlyAdminWorkspaceBypass() {
  const accessSource = read("lib/saas/access.ts");
  assert.match(
    accessSource,
    /export function isOpturonAdminWorkspaceContext\(ctx: \{\s*tenantId\?: string;\s*globalRole\?: Parameters<typeof isStaffRole>\[0\];\s*accountScope\?: string;\s*\}\)/
  );
  assert.match(
    accessSource,
    /return Boolean\(ctx\.tenantId && isStaffRole\(ctx\.globalRole\) && normalizeScope\(ctx\.accountScope\) === "opturon_admin"\);/
  );
  assert.match(accessSource, /if \(isOpturonAdminWorkspaceContext\(ctx\)\) return null;/);
}

function testLayoutUsesAdminWorkspaceBypass() {
  const layoutSource = read("app/app/layout.tsx");
  assert.match(layoutSource, /!isOpturonAdminWorkspaceContext\(ctx\)/);
}

function run() {
  testAccessDefinesStaffOnlyAdminWorkspaceBypass();
  testLayoutUsesAdminWorkspaceBypass();
  console.log("opturon-admin-workspace-module-bypass.test.ts: ok");
}

run();
