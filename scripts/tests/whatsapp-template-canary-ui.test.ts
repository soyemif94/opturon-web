import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const ui = read("components/app/whatsapp-template-canary.tsx");
const styles = read("app/globals.css");
const route = read("app/api/app/integrations/whatsapp/templates/canary/route.ts");
const refreshRoute = read("app/api/app/integrations/whatsapp/templates/canary/refresh/route.ts");
const hub = read("components/app/integrations-hub.tsx");

test("WABA, connected number and connection identity are visible", () => {
  assert.match(ui, /label="WABA"/); assert.match(ui, /label="Numero conectado"/); assert.match(ui, /label="Display name"/); assert.match(ui, /label="Conexion"/);
});
test("real template list renders provider status and language", () => {
  assert.match(ui, /workspace\?\.templates\.map/); assert.match(ui, /item\.language/); assert.match(ui, /item\.status\.toUpperCase/);
});
test("refresh queries Meta through the protected backend sync", () => {
  assert.match(ui, /Actualizar desde Meta/); assert.match(ui, /Actualizando…/); assert.match(ui, /canary\/refresh/);
  assert.match(refreshRoute, /permission: "manage_workspace"/); assert.match(refreshRoute, /refreshPortalWhatsAppTemplateCanary/);
  assert.match(refreshRoute, /portalActorId/); assert.doesNotMatch(refreshRoute, /accessToken|WHATSAPP_ACCESS_TOKEN/);
});
test("empty templates and recipients have separate semantic states", () => {
  assert.match(ui, /No hay plantillas de Meta disponibles/); assert.match(ui, /No hay plantillas APPROVED compatibles/);
  assert.match(ui, /No hay destinatarios internos activos con consentimiento granted/);
});
test("safe backend failures no longer collapse into the generic message", () => {
  assert.match(ui, /whatsapp_canary_load_failed/); assert.match(ui, /whatsapp_canary_sync_failed/);
  assert.match(ui, /whatsapp_channel_not_found/); assert.match(ui, /meta_templates_sync_failed/);
});
test("template and recipient selection are controlled", () => {
  assert.match(ui, /value=\{templateId\}/); assert.match(ui, /value=\{recipientId\}/); assert.match(ui, /phoneMasked/);
});
test("real component variables drive ordered inputs and preview", () => {
  assert.match(ui, /template\?\.variables\.map/); assert.match(ui, /componentIndex/); assert.match(ui, /replaceAll/); assert.match(ui, /unsupportedReason/);
});
test("send remains disabled until the contract is complete", () => {
  assert.match(ui, /template\.variables\.every/); assert.match(ui, /disabled=\{!ready \|\| busy\}/);
});
test("double click is blocked and one idempotency key is sent", () => {
  assert.match(ui, /if \(!ready \|\| busy\) return/); assert.match(ui, /idempotencyKey: key/); assert.match(ui, /crypto\.randomUUID/);
});
test("sending, success and failure states are visible", () => {
  assert.match(ui, /Enviando…/); assert.match(ui, /Resultado real/); assert.match(ui, /role="alert"/); assert.match(ui, /errorDetail/);
});
test("safe retry creates a new attempt instead of reusing an ambiguous request", () => {
  assert.match(ui, /function newAttempt/); assert.match(ui, /Preparar nuevo intento/); assert.match(ui, /unknown_delivery/);
});
test("status timeline contains only provider-backed states", () => {
  assert.match(ui, /\["sent", "delivered", "read"\]/); assert.match(ui, /Sin estados simulados/); assert.match(ui, /wamid/);
});
test("Inbox continuation links to the exact persisted conversation", () => {
  assert.match(ui, /\/app\/inbox\?conversation=\$\{attempt\.conversationId\}/);
});
test("read-only users cannot reach either Canary API method", () => {
  assert.match(route, /permission: "manage_workspace"/); assert.match(route, /async function authority/);
});
test("actor and tenant come only from the authenticated session", () => {
  assert.match(route, /auth\.ctx\.tenantId/); assert.match(route, /auth\.ctx\.portalActorId/); assert.doesNotMatch(route, /payload\.tenantId|payload\.actorId/);
});
test("backend absence fails closed with no simulated success", () => {
  assert.match(route, /backend_not_configured/); assert.doesNotMatch(route, /success: true,\s*data: \{\s*tenantId/);
});
test("Canary is integrated in the productive Integrations surface", () => {
  assert.match(hub, /<WhatsAppTemplateCanary \/>/); assert.match(hub, /whatsapp-template-canary/);
});
test("responsive layout stacks on mobile and splits only at xl", () => {
  assert.match(ui, /grid gap-4 xl:grid-cols/); assert.doesNotMatch(ui, /min-w-\[[4-9]\d\dpx\]|w-\[[4-9]\d\dpx\]/);
  assert.match(styles, /\.wa-canary-control\s*\{[\s\S]*?width:\s*100%/);
});
test("Canary native selects keep dark surfaces and readable options without hover", () => {
  assert.match(ui, /<select className="wa-canary-control wa-canary-select" data-canary-control="template"/);
  assert.match(ui, /<select className="wa-canary-control wa-canary-select" data-canary-control="recipient"/);
  assert.match(styles, /\.wa-canary-control\s*\{[\s\S]*?background-color:\s*var\(--field-bg\)[\s\S]*?color:\s*var\(--text\)[\s\S]*?color-scheme:\s*dark/);
  assert.match(styles, /\.wa-canary-select option\s*\{[\s\S]*?background-color:\s*var\(--card\)[\s\S]*?color:\s*var\(--text\)/);
  assert.doesNotMatch(styles, /\.wa-canary-select option:hover/);
});
test("body variable inputs share placeholder, focus and disabled contrast contracts", () => {
  assert.match(ui, /<input className="wa-canary-control" data-canary-control="variable"/);
  assert.match(styles, /\.wa-canary-control::placeholder\s*\{[\s\S]*?color:\s*var\(--text-muted\)/);
  assert.match(styles, /\.wa-canary-control:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--brand\)/);
  assert.match(styles, /\.wa-canary-control:disabled,[\s\S]*?\.wa-canary-control:read-only[\s\S]*?background-color:\s*var\(--surface-muted\)[\s\S]*?color:\s*var\(--text-muted\)/);
});
test("light mode restores native light color scheme without changing semantic colors", () => {
  assert.match(styles, /\[data-app-theme="light"\] \.wa-canary-control\s*\{[\s\S]*?color-scheme:\s*light/);
  assert.match(styles, /\[data-app-theme="light"\][\s\S]*?--field-bg:\s*#FFFAF9/);
  assert.match(styles, /\[data-app-theme="light"\][\s\S]*?--text:\s*#2B2323/);
});
test("recipient safety is explicit and phones stay masked", () => {
  assert.match(ui, /destinatarios internos consentidos/); assert.match(ui, /consentimiento granted/); assert.doesNotMatch(ui, /\+549\d{8,}/);
});
test("recent audit exposes template, actor-derived attempt and status without secrets", () => {
  assert.match(ui, /Actividad reciente/); assert.match(ui, /item\.templateName/); assert.match(ui, /item\.status/); assert.doesNotMatch(ui, /accessToken|Bearer/);
});
