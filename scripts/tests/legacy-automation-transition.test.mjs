import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");
const shell = read("components/layout/app-shell.tsx");
const dashboard = read("components/app/app-dashboard.tsx");
const appHome = read("app/app/page.tsx");
const workspace = read("components/app/InboxWorkspace.tsx");
const profile = read("components/app/inbox/ProfilePanel.tsx");
const chat = read("components/app/inbox/ChatPanel.tsx");
const api = read("app/api/app/inbox/[id]/route.ts");

assert.doesNotMatch(shell, /href=["']\/app\/automations/);
assert.match(dashboard, /Configurar asistente/);
assert.match(dashboard, /href="\/app\/settings\/bot"/);
assert.match(appHome, /href: "\/app\/settings\/bot"/);
assert.doesNotMatch(appHome, /Ver automatizaciones|\/app\/automations/);

for (const route of ["app/app/automations/page.tsx", "app/app/automations/new/page.tsx", "app/app/automations/templates/page.tsx"]) {
  const source = read(route);
  assert.match(source, /redirect\("\/app\/settings\/bot"\)/, `${route} redirects to modern assistant settings`);
  assert.doesNotMatch(source, /AutomationsHub|AutomationBuilder/);
}

assert.doesNotMatch(profile, /Configuración del bot|Automatico|Modo actual/);
assert.doesNotMatch(workspace, /set_bot_flow_lock|set_bot_domain_override|botFlowLock|botDomainOverride/);
assert.match(chat, /Pausar bot para esta conversación/);
assert.match(chat, /Retomar bot para esta conversación/);
assert.doesNotMatch(api, /set_bot_flow_lock|set_bot_domain_override|botFlowLock|botDomainOverride/);

console.log("legacy-automation-transition.test.mjs passed");
