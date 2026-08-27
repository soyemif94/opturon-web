import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");
const page = read("app/app/integrations/page.tsx");
const hub = read("components/app/integrations-hub.tsx");
const client = read("components/app/client-integrations-experience.tsx");
const admin = read("components/app/AdminClientConfiguration.tsx");

test("client and reviewer scopes receive the simple surface through the authoritative account scope", () => {
  assert.match(page, /isOpturonAdminWorkspaceContext\(ctx\)/);
  assert.match(page, /if \(!isOpturonAdmin\)/);
  assert.match(page, /isOpturonAdmin=\{false\}/);
  assert.doesNotMatch(page, /ctx\.(?:email|name)|session\.user\.(?:email|name)/);
  assert.match(hub, /if \(!isOpturonAdmin\)/);
  assert.match(hub, /<ClientIntegrationsExperience/);
});

test("client header and catalog contain exactly the two real channels", () => {
  assert.match(page, />Integraciones</);
  assert.match(page, /Conectá los canales que usa tu negocio\./);
  assert.match(client, /title="WhatsApp Business"/);
  assert.match(client, /title="Instagram"/);
  assert.doesNotMatch(client, /CRM externo|Agenda de Opturon|Roadmap|Messenger|Webchat|Google Calendar/);
});

test("technical WhatsApp payload is not fetched for non-admin sessions", () => {
  assert.match(
    page,
    /isOpturonAdmin \? getPortalWhatsAppStatus\(ctx\.tenantId\)\.catch\(\(\) => null\) : Promise\.resolve\(null\)/
  );
  assert.doesNotMatch(client, /WABA|Phone Number ID|webhook|Provider|inbound|outbound|job|Canary|botConfig|botRuntime/);
});

test("WhatsApp has friendly disconnected, connecting, connected and error states", () => {
  assert.match(client, /whatsapp\.state === "connected"/);
  assert.match(client, /whatsapp\.state === "launching" \|\| whatsapp\.state === "pending_meta"/);
  assert.match(client, /whatsapp\.state === "error" \|\| whatsapp\.state === "ambiguous_configuration"/);
  assert.match(client, /"Conectar WhatsApp"/);
  assert.match(client, />Gestionar</);
  assert.match(client, /Solicitar ayuda/);
  assert.match(client, /client-integrations-connect/);
  assert.doesNotMatch(client, /embedded-signup|manual-connect/);
});

test("Instagram uses the real OAuth route and keeps selection and errors friendly", () => {
  assert.match(client, /href="\/api\/app\/integrations\/instagram\/start"/);
  assert.match(client, />Conectar Instagram</);
  assert.match(client, /data-instagram-selection/);
  assert.match(client, /Conectar cuenta seleccionada/);
  assert.match(client, /Intentar nuevamente/);
  assert.doesNotMatch(client, /Meta rechazo|invalid_scope|Login Configuration ID/);
  assert.match(client, /Desconectar Instagram/);
  assert.match(client, /Tus conversaciones e historial no se eliminarán/);
  assert.match(client, /onConfirm=\{onDisconnectInstagram\}/);
});

test("connected customer identity is friendly and technical Instagram ID is secondary", () => {
  assert.match(client, /formatCustomerPhone/);
  assert.match(client, /formatInstagramUsername/);
  assert.match(client, /<details[\s\S]*Detalles de conexión[\s\S]*Professional Account ID/);
  assert.doesNotMatch(client, /externalPageId|wabaId|phoneNumberId/);
});

test("internal diagnostics remain available only on the admin branch and Client Management", () => {
  assert.match(hub, /<WhatsAppStatusPanel/);
  assert.match(hub, /Diagnostico operativo/);
  assert.match(admin, /id: "integrations", label: "Integraciones"/);
  assert.match(admin, /id: "diagnostics", label: "Diagnóstico"/);
  assert.match(admin, /Identificadores técnicos/);
});

test("responsive cards stack by default and split without fixed widths", () => {
  assert.match(client, /grid min-w-0 gap-4 md:grid-cols-2/);
  assert.match(client, /w-full rounded-xl sm:w-auto/);
  assert.match(client, /min-w-0/);
  assert.doesNotMatch(client, /min-w-\[|w-\[(?:3|4|5|6|7|8|9)\d\dpx\]|overflow-x-auto/);
});

test("bot configuration stays in Settings rather than the client integration surface", () => {
  const settings = read("app/app/settings/page.tsx");
  assert.match(settings, /href="\/app\/settings\/bot"/);
  assert.doesNotMatch(client, /Bot configurado|Nombre del bot|Saludo personalizado|Fallback personalizado/);
});
