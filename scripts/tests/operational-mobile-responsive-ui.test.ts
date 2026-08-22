import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const shell = read("components/app/client-page-shell.tsx");
const card = read("components/ui/card.tsx");
const orders = read("components/app/OrderCreateEditor.tsx");
const inventory = read("components/app/InventoryBaseWorkspace.tsx");
const lots = read("components/app/InventoryLotsWorkspace.tsx");
const movements = read("components/app/InventoryMovementsWorkspace.tsx");
const nav = read("components/app/InventorySectionNav.tsx");

test("shared operational shells release intrinsic width without hiding document overflow", () => {
  assert.match(shell, /data-operational-workspace/);
  assert.match(shell, /min-w-0 max-w-full/);
  assert.match(card, /min-w-0 max-w-full rounded-2xl/);
  assert.doesNotMatch(shell, /overflow-x-hidden/);
});

test("order creation uses mobile cards instead of the fixed desktop cart grid", () => {
  assert.match(orders, /hidden grid-cols-\[minmax\(0,1\.3fr\)_160px_160px_180px_80px\][\s\S]*?lg:grid/);
  assert.match(orders, /grid min-w-0 gap-4[\s\S]*?lg:grid-cols-\[minmax\(0,1\.3fr\)_160px_160px_180px_80px\]/);
  assert.match(orders, />Precio unitario</);
  assert.match(orders, />Cantidad</);
  assert.match(orders, />Subtotal</);
  assert.match(orders, /sm:min-w-\[220px\]/);
  assert.doesNotMatch(orders, /className="h-10 min-w-\[220px\]/);
});

test("long operational strings wrap or break inside bounded children", () => {
  assert.match(orders, /break-words text-base font-semibold text-text/);
  assert.match(orders, /break-all text-sm text-muted/);
  assert.match(inventory, /break-all font-mono text-xs text-muted/);
  assert.match(movements, /CardDescription className="break-all"/);
});

test("inventory tables are contained rails and mobile lots retain operational actions", () => {
  assert.match(inventory, /max-w-full overflow-x-auto overscroll-x-contain/);
  assert.match(lots, /md:hidden/);
  assert.match(lots, /hidden w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain/);
  for (const label of ["Disponible", "Comprometido", "Vencimiento", "Dias restantes", "Historial", "Dar de baja", "Ajustar stock", "Editar venc."]) {
    assert.match(lots, new RegExp(label.replace(".", "\\.")));
  }
});

test("inventory navigation is a keyboard-accessible contained rail with active reveal", () => {
  assert.match(nav, /data-horizontal-rail="inventory-sections"/);
  assert.match(nav, /overflow-x-auto overscroll-x-contain/);
  assert.match(nav, /aria-current=\{active \? "page"/);
  assert.match(nav, /scrollIntoView/);
  assert.match(nav, /focus-visible:ring-2/);
});

test("inventory filters cannot inherit long option min-content widths", () => {
  assert.match(inventory, /w-full min-w-0 max-w-full rounded-xl/);
  assert.match(lots, /w-full min-w-0 max-w-full rounded-xl/);
  assert.match(movements, /\[&_select\]:w-full \[&_select\]:min-w-0 \[&_select\]:max-w-full/);
});
