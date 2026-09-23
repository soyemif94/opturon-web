const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("app/(public)/page.tsx");
const home = read("components/sections/SaasHome.tsx");
const navbar = read("components/navbar.tsx");
const footer = read("components/footer.tsx");

test("positions Opturon as a connected SaaS platform", () => {
  assert.match(home, /Vendé, organizá y controlá tu operación desde un solo lugar/);
  assert.match(home, /WhatsApp, Instagram, clientes, pedidos, stock y equipo/);
  assert.match(page, /SoftwareApplication/);
  assert.doesNotMatch(page, /CRM conversacional para vender por WhatsApp/);
});

test("makes the distribution vertical and operational flow visible", () => {
  assert.match(home, /Diseñado para distribuidoras/);
  assert.match(home, /Consulta.*Cliente.*Pedido.*Stock.*Cobro.*Control/s);
  for (const term of ["Pedidos claros", "Stock visible", "Entrega coordinada", "Cobranza ordenada"]) {
    assert.match(home, new RegExp(term));
  }
});

test("uses product and demo navigation without the legacy agency menu", () => {
  for (const term of ["Producto", "Distribuidoras", "Automatización", "Demo", "Ingresar"]) {
    assert.match(navbar, new RegExp(term));
  }
  for (const term of ["Servicios", "Portfolio", "Casos", "Quienes Somos"]) {
    assert.doesNotMatch(navbar, new RegExp(term));
  }
});

test("uses first-party conversion routes and removes the sticky WhatsApp CTA", () => {
  assert.match(home, /href="\/contacto"/);
  assert.match(home, /href="\/demo"/);
  assert.doesNotMatch(home + page + navbar + footer, /wa\.me/);
  assert.doesNotMatch(page, /HomeStickyWhatsAppCta/);
});
