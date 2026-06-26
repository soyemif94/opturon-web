import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testSharedDarkSelectExists() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");

  assert.match(source, /function PartnerPortalSelect/);
  assert.match(source, /data-partner-portal-select/);
  assert.match(source, /data-partner-portal-select-panel/);
  assert.match(source, /role="listbox"/);
  assert.match(source, /role="option"/);
  assert.match(source, /aria-selected/);
}

function testDropdownPanelUsesDarkVisibleTokens() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");

  assert.match(source, /PREMIUM_SELECT_TRIGGER/);
  assert.match(source, /bg-slate-950\/70/);
  assert.match(source, /text-slate-100/);
  assert.match(source, /focus:ring-2/);
  assert.match(source, /PREMIUM_SELECT_PANEL/);
  assert.match(source, /bg-\[linear-gradient\(180deg,rgba\(7,16,30,0\.98\),rgba\(10,23,41,0\.98\)\)\]/);
  assert.match(source, /z-\[80\]/);
  assert.match(source, /max-h-64/);
  assert.match(source, /PREMIUM_SELECT_OPTION/);
  assert.match(source, /data-\[selected=true\]:bg-amber-300\/12/);
  assert.match(source, /disabled:text-slate-500/);
}

function testAllPartnerFiltersUseSharedSelect() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");

  assert.match(source, /ariaLabel="Filtrar clientes por estado"/);
  assert.match(source, /ariaLabel="Filtrar clientes por estado de pago"/);
  assert.match(source, /ariaLabel="Ordenar clientes"/);
  assert.match(source, /ariaLabel="Filtrar comisiones por estado"/);
  assert.match(source, /ariaLabel="Filtrar comisiones por tipo"/);
  assert.doesNotMatch(source, /<select[^>]*statusFilter/s);
  assert.doesNotMatch(source, /<select[^>]*typeFilter/s);
  assert.doesNotMatch(source, /<select[^>]*paymentFilter/s);
}

function testKeyboardNavigationIsSupported() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");

  assert.match(source, /event\.key === "ArrowDown"/);
  assert.match(source, /event\.key === "ArrowUp"/);
  assert.match(source, /event\.key === "Enter"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /moveActive/);
}

function run() {
  testSharedDarkSelectExists();
  testDropdownPanelUsesDarkVisibleTokens();
  testAllPartnerFiltersUseSharedSelect();
  testKeyboardNavigationIsSupported();
  console.log("partners-dropdown-contrast.test.ts: ok");
}

run();
