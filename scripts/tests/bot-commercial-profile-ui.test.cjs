const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const form = fs.readFileSync(path.join(root, 'components/app/BotConfigForm.tsx'), 'utf8');
const route = fs.readFileSync(path.join(root, 'app/api/app/settings/bot-config/route.ts'), 'utf8');
const page = fs.readFileSync(path.join(root, 'app/app/settings/bot/page.tsx'), 'utf8');
const api = fs.readFileSync(path.join(root, 'lib/api.ts'), 'utf8');

assert.match(form, /Comportamiento comercial/i, 'commercial section renders');
assert.match(form, /initialConfig[\s\S]*businessProfilePreset/, 'saved values are normalized from initial config');
assert.match(form, /wholesale_distributor:[\s\S]*commercialObjective: "order_generation"[\s\S]*salesMode: "proactive"/, 'wholesale preset applies expected defaults');
assert.match(form, /updateField\("businessInstructions", event\.target\.value\)/, 'instructions remain editable');
assert.match(form, /JSON\.stringify\(normalized\)/, 'save payload includes normalized commercial fields');
assert.match(page, /businessProfilePreset: null[\s\S]*commercialObjective: null[\s\S]*salesMode: null/, 'existing tenants receive neutral defaults');
assert.match(form, /canReplaceInstructions[\s\S]*currentInstructions === previousDefault/, 'custom instructions are preserved on preset changes');
assert.match(form, /json\?\.fieldErrors[\s\S]*setFeedback\(\{ tone: "error"/, 'API errors remain visible');
assert.match(form, /label="Perfil"[\s\S]*label="Objetivo"[\s\S]*label="Estilo"[\s\S]*Catálogo y datos reales/, 'preview reflects commercial configuration and real data source');
assert.match(form, /Nombre del bot[\s\S]*Saludo inicial[\s\S]*Mensaje fuera de horario[\s\S]*Fallback personalizado[\s\S]*derivacion a humano/i, 'existing bot settings remain available');
assert.match(route, /requireAppApi\(\{ permission: "manage_workspace" \}\)[\s\S]*guard\.ctx\?\.tenantId/, 'BFF uses authenticated tenant scope');
assert.match(route, /businessInstructions: z\.string\(\)\.max\(4000\)/, 'BFF rejects oversized instructions');
assert.match(api, /businessProfilePreset:[\s\S]*commercialObjective:[\s\S]*salesMode:[\s\S]*businessInstructions:/, 'API contract includes commercial fields');

console.log('BOT.COMMERCIAL.PROFILE frontend validation passed');
