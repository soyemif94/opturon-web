import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const ui = read("components/app/whatsapp-template-canary.tsx");
const route = read("app/api/app/integrations/whatsapp/templates/canary/route.ts");
const hub = read("components/app/integrations-hub.tsx");

test("WABA, connected number and connection identity are visible", () => {
  assert.match(ui, /label="WABA"/); assert.match(ui, /label="Numero conectado"/); assert.match(ui, /label="Display name"/); assert.match(ui, /label="Conexion"/);
});
test("real template list renders provider status and language", () => {
  assert.match(ui, /workspace\?\.templates\.map/); assert.match(ui, /item\.language/); assert.match(ui, /item\.status\.toUpperCase/);
});
test("template and recipient selection are controlled", () => {
  assert.match(ui, /value=\{templateId\}/); assert.match(ui, /value=\{recipientId\}/); assert.match(ui, /phoneMasked/);
});
test("real component variables drive ordered inputs and preview", () => {
  assert.match(ui, /template\?\.variables\.map/); assert.match(ui, /componentIndex/); assert.match(ui, /replaceAll/);
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
});
test("recipient safety is explicit and phones stay masked", () => {
  assert.match(ui, /destinatarios internos consentidos/); assert.match(ui, /consentimiento granted/); assert.doesNotMatch(ui, /\+549\d{8,}/);
});
test("recent audit exposes template, actor-derived attempt and status without secrets", () => {
  assert.match(ui, /Actividad reciente/); assert.match(ui, /item\.templateName/); assert.match(ui, /item\.status/); assert.doesNotMatch(ui, /accessToken|Bearer/);
});
