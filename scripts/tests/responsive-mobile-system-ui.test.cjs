const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("shared operations paginator keeps both actions reachable on mobile", () => {
  const source = read("components/app/operations-workspace-ui.tsx");
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.match(source, /sm:min-w-\[36rem\]/);
  assert.match(source, /Pág\. \{displayedPage\}\/\{totalPages\}/);
});

test("invoice workspace permits single-column tracks to shrink", () => {
  const source = read("components/app/InvoicesWorkspace.tsx");
  assert.match(source, /grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-6/);
  assert.match(source, /aside className="min-w-0 space-y-4"/);
  assert.match(source, /select className="h-12 min-w-0 max-w-full/);
});

test("dialog and shell use dynamic viewport-safe mobile surfaces", () => {
  const dialog = read("components/ui/dialog.tsx");
  const shell = read("components/layout/app-shell.tsx");
  assert.match(dialog, /max-h-\[calc\(100dvh-1\.5rem\)\]/);
  assert.match(dialog, /overflow-y-auto/);
  assert.match(dialog, /flex-col-reverse gap-2 sm:flex-row/);
  assert.match(shell, /min-h-dvh/);
  assert.match(shell, /h-dvh max-h-dvh/);
  assert.doesNotMatch(shell, /100vh|h-screen/);
});
