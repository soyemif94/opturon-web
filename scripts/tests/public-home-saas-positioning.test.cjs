const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("app/(public)/page.tsx");
const demo = read("app/(public)/demo/page.tsx");
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

test("shows the real Opturon inbox as the primary product proof", () => {
  assert.match(home, /opturon-inbox-client-portal\.png/);
  assert.match(home, /Producto real/);
  assert.match(home, /Inbox omnicanal de Opturon/);
  assert.doesNotMatch(home, /Vista ilustrativa de la plataforma Opturon/);
});

test("uses the same real inbox in the demo journey", () => {
  assert.match(demo, /opturon-inbox-client-portal\.png/);
  assert.doesNotMatch(demo, /variant="hero"/);
  assert.doesNotMatch(demo, /variant="inbox"/);
});

test("replaces the legacy pipeline mockup with the real sanitized sales product", () => {
  assert.match(demo, /opturon-sales-pipeline-client-portal\.png/);
  assert.match(demo, /Entrantes, Seguimiento y Cierre/);
  assert.doesNotMatch(demo, /HomeProductMockup/);
  assert.doesNotMatch(demo, /variant="pipeline"/);
  assert.match(home, /opturon-inbox-client-portal\.png/);
  assert.match(home, /opturon-orders-create-order\.png/);
  assert.match(home, /opturon-catalog-client-portal\.png/);
  assert.match(home, /opturon-metrics-client-portal\.png/);
});

test("continues the product story from conversation to a real order", () => {
  assert.match(home, /De la conversación a la operación/);
  assert.match(home, /opturon-orders-create-order\.png/);
  assert.match(home, /Cliente y responsable.*Catálogo y stock.*Total y cobro/s);
});

test("extends the real product journey with the connected catalog", () => {
  assert.match(home, /Trabajá con un catálogo real, conectado a la operación/);
  assert.match(home, /opturon-catalog-client-portal\.png/);
  assert.match(home, /Productos reales.*Stock visible.*Búsqueda operativa.*Gestión centralizada/s);
});

test("closes the real product journey with commercial metrics", () => {
  assert.match(home, /Convertí la actividad del canal en visibilidad comercial/);
  assert.match(home, /opturon-metrics-client-portal\.png/);
  assert.match(home, /Canal en tiempo real.*Trabajo humano.*Automatización visible.*Rendimiento operativo/s);
  assert.match(home, /opturon-inbox-client-portal.*opturon-orders-create-order.*opturon-catalog-client-portal.*opturon-metrics-client-portal/s);
});
