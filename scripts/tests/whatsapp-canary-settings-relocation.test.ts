import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const settings = read("app/app/settings/page.tsx");
const canaryPage = read("app/app/settings/canary/page.tsx");
const hub = read("components/app/integrations-hub.tsx");
const component = read("components/app/whatsapp-template-canary.tsx");
const route = read("app/api/app/integrations/whatsapp/templates/canary/route.ts");
const refreshRoute = read("app/api/app/integrations/whatsapp/templates/canary/refresh/route.ts");

test("only the authoritative opturon_admin scope receives the Settings card", () => {
  assert.match(settings, /const isOpturonAdmin = isOpturonAdminWorkspaceContext\(ctx\)/);
  assert.match(settings, /\{isOpturonAdmin \? \([\s\S]*href="\/app\/settings\/canary"[\s\S]*\) : null\}/);
  assert.doesNotMatch(settings, /email.*Canary|name.*Canary|tenant.*Canary/i);
});

test("the direct page and both BFF operations fail closed for clients and reviewers", () => {
  assert.match(canaryPage, /requireOpturonAdminPage\("\/app\/settings\/canary"\)/);
  assert.match(route, /requireOpturonAdminApi\(\)/);
  assert.match(refreshRoute, /requireOpturonAdminApi\(\)/);
});

test("Settings presents the approved internal copy and navigation", () => {
  assert.match(settings, /title="Prueba de WhatsApp"/);
  assert.match(settings, /Verificá con un envío controlado que plantillas, entrega y estados del canal WhatsApp estén funcionando correctamente\./);
  assert.match(settings, /cta="Abrir prueba"/);
  assert.match(canaryPage, /badge="Canary interno"/);
  assert.match(canaryPage, /Herramienta interna de diagnóstico\. No corresponde al sistema de alertas automáticas de clientes\./);
  assert.match(canaryPage, /Gestionar destinatarios autorizados/);
  assert.match(canaryPage, /href="\/app\/settings\/operational-alerts"/);
});

test("Integrations no longer imports or renders Canary", () => {
  assert.doesNotMatch(hub, /WhatsAppTemplateCanary|whatsapp-template-canary|Canary de WhatsApp/);
});

test("the complete existing Canary runtime is reused without send execution in tests", () => {
  assert.match(canaryPage, /<WhatsAppTemplateCanary \/>/);
  assert.match(component, /Actualizar desde Meta/);
  assert.match(component, /selectionToken|templateId/);
  assert.match(component, /recipientId/);
  assert.match(component, /idempotencyKey/);
  assert.match(component, /wamid/);
  assert.match(component, /\["sent", "delivered", "read"\]/);
  assert.doesNotMatch(import.meta.url, /sendPortalWhatsAppTemplateCanary/);
});

test("the relocated page keeps the existing responsive component free of fixed widths", () => {
  assert.match(canaryPage, /min-w-0 max-w-full overflow-hidden/);
  assert.match(component, /grid gap-4 xl:grid-cols/);
  assert.doesNotMatch(component, /min-w-\[[4-9]\d\dpx\]|w-\[[4-9]\d\dpx\]/);
});
