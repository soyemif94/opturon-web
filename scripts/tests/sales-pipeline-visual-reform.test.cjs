const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const salesHub = fs.readFileSync(path.join(root, "components/app/sales-hub.tsx"), "utf8");
const salesPage = fs.readFileSync(path.join(root, "app/app/sales/page.tsx"), "utf8");

test("sales page presents the real pipeline as the primary workspace", () => {
  assert.match(salesPage, /title="Ventas en movimiento"/);
  assert.match(salesHub, /data-sales-pipeline-board/);
  assert.match(salesHub, /data-sales-kanban/);
  assert.match(salesHub, /label: "Entrantes"/);
  assert.match(salesHub, /label: "Seguimiento"/);
  assert.match(salesHub, /label: "Cierre"/);
});

test("pipeline cards are driven by real opportunities and preserve actions", () => {
  assert.match(salesHub, /visibleOpportunities\.filter\(\(item\) => column\.lanes\.includes\(item\.lane\)\)/);
  assert.match(salesHub, /item=\{item\}/);
  assert.match(salesHub, /onArchive=\{\(\) => void archiveOpportunitySelection\(\[item\.id\]\)\}/);
  assert.match(salesHub, /onRestoreOrphan=\{\(\) => void restoreHiddenOrphanOpportunity\(item\.id\)\}/);
  assert.match(salesHub, /href=\{`\/app\/contacts\/\$\{item\.contactId\}`\}/);
});

test("pipeline retains search, filters, archive and responsive containment", () => {
  assert.match(salesHub, /value=\{searchQuery\}/);
  assert.match(salesHub, /setOpportunityFilter\("active_conversations"\)/);
  assert.match(salesHub, /setListMode\("archive"\)/);
  assert.match(salesHub, /overflow-x-auto/);
  assert.match(salesHub, /xl:grid-cols-3/);
});
