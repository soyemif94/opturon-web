const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const integrationsPage = read('app/app/integrations/page.tsx');
const integrationsHub = read('components/app/integrations-hub.tsx');
const clientCard = read('components/app/client-integrations-experience.tsx');
const admin = read('components/app/AdminClientConfiguration.tsx');
const chat = read('components/app/inbox/ChatPanel.tsx');
const bubble = read('components/app/inbox/MessageBubble.tsx');
const types = read('components/app/inbox/types.ts');

assert.match(integrationsPage, /getPortalWhatsAppStatus\(ctx\.tenantId\)/);
assert.match(integrationsPage, /statusResult\?\.data\?\.coexistence/);
assert.match(integrationsPage, /clientCoexistenceStatus=\{clientCoexistenceStatus\}/);
assert.match(integrationsHub, /setLiveClientCoexistenceStatus\(statusJson\.data\.coexistence \|\| null\)/);
assert.match(clientCard, /Ya uso WhatsApp Business/);
assert.match(clientCard, /seguí respondiendo desde tu teléfono mientras Opturon gestiona los mensajes/);
assert.match(clientCard, /Meta lo ofrece y aceptás compartirlo durante el alta/);
assert.match(clientCard, /customerSyncLabel/);
assert.match(clientCard, /coexistenceStatus\?\.status !== "active"/);
assert.match(clientCard, /Modo: WhatsApp Business \+ Opturon/);
assert.match(clientCard, /formatCoexistencePhone/);
assert.match(admin, /Diagnóstico de Coexistence/);
assert.match(admin, /phoneLast4/);
assert.match(admin, /Último eco desde la app/);
assert.match(admin, /Último mensaje entrante/);
assert.match(admin, /role="status"/);
assert.match(chat, /origin=\{item\.payload\.origin\}/);
assert.match(bubble, /human_whatsapp_business_app/);
assert.match(bubble, /WhatsApp Business/);
assert.match(types, /origin\?: "human_whatsapp_business_app" \| "history_import"/);

console.log('whatsapp-coexistence-ui.test.js passed');
