const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "components/layout/app-shell.tsx"), "utf8");

test("desktop sidebar has immutable collapsed and expanded width contracts", () => {
  assert.match(source, /data-sidebar-state=\{expanded \? "expanded" : "collapsed"\}/);
  assert.match(source, /expanded \? "w-\[272px\]" : "w-\[92px\]"/);
  assert.match(source, /expanded \? "w-full justify-start gap-3 px-3" : "w-11 justify-center px-0"/);
  assert.doesNotMatch(source, /hover:w-|group-hover:w-|hover:px-|group-hover:px-/);
});

test("scroll geometry cannot be changed by hover labels or badges", () => {
  assert.match(source, /data-sidebar-nav/);
  assert.match(source, /overflow-x-hidden overflow-y-auto overscroll-contain/);
  assert.match(source, /scrollbar-gutter:stable_both-edges/);
  assert.doesNotMatch(source, /left-\[calc\(100%\+12px\)\]/);
  assert.doesNotMatch(source, /group-hover:block/);
  assert.doesNotMatch(source, /-right-1|-top-1/);
  assert.match(source, /title=\{expanded \? undefined : item\.label\}/);
});

test("logo control toggles only explicit state with native keyboard and accessible semantics", () => {
  assert.match(source, /<button[\s\S]*?data-sidebar-toggle[\s\S]*?onClick=\{onToggle\}/);
  assert.match(source, /aria-label=\{expanded \? "Contraer navegación" : "Expandir navegación"\}/);
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /onToggle=\{\(\) => setDesktopNavExpanded\(\(current\) => !current\)\}/);
  assert.doesNotMatch(source, /onMouseEnter[\s\S]{0,200}setDesktopNavExpanded|onMouseLeave[\s\S]{0,200}setDesktopNavExpanded/);
  assert.match(source, /focus-visible:ring-2 focus-visible:ring-brandBright/);
});

test("labels, active state and authorization reuse the real navigation model", () => {
  for (const label of ["Inicio", "Bandeja", "Contactos", "Agenda", "Ventas", "Fidelizacion", "Catalogo", "Inventario", "Pedidos", "Comprobantes", "Cobros", "Caja", "Automatizaciones", "Metricas", "Integraciones", "Configuracion"]) {
    assert.match(source, new RegExp(`label: "${label}"`));
  }
  assert.match(source, /visibleNavItems = navItems\.filter\(\(item\) => canAccessAppModule\(accessContext, item\.module\)/);
  assert.match(source, /!item\.adminOnly \|\| isOpturonAdmin/);
  assert.match(source, /data-active=\{active \? "true" : "false"\}/);
  assert.match(source, /aria-current=\{active \? "page" : undefined\}/);
});

test("browser persistence defaults collapsed and never adds server state", () => {
  assert.match(source, /APP_SIDEBAR_STORAGE_KEY = "opturon-desktop-sidebar-expanded"/);
  assert.match(source, /useState\(false\)/);
  assert.match(source, /localStorage\.getItem\(APP_SIDEBAR_STORAGE_KEY\) === "true"/);
  assert.match(source, /localStorage\.setItem\(APP_SIDEBAR_STORAGE_KEY, String\(desktopNavExpanded\)\)/);
  assert.match(source, /if \(!desktopNavPreferenceLoaded\) return/);
});

test("motion and responsive contracts preserve tablet/mobile drawer behavior", () => {
  assert.match(source, /motion-safe:transition-\[width\]/);
  assert.match(source, /motion-reduce:transition-none/);
  assert.match(source, /hidden shrink-0 self-start overflow-x-hidden xl:block/);
  assert.match(source, /hover:text-text xl:hidden/);
  assert.match(source, /<Dialog open=\{sidebarOpen\}/);
  assert.match(source, /data-app-shell[\s\S]*?overflow-x-hidden/);
  assert.match(source, /<div className="flex min-w-0 flex-1">/);
});
