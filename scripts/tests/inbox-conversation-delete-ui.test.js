const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const chat = read('components/app/inbox/ChatPanel.tsx');
const workspace = read('components/app/InboxWorkspace.tsx');
const route = read('app/api/app/inbox/[id]/route.ts');
const page = read('app/app/inbox/page.tsx');
const permissions = read('lib/app-permissions.ts');

assert.match(chat, /<details className="relative">[\s\S]*Más acciones[\s\S]*Eliminar conversación[\s\S]*<\/details>/);
assert.match(chat, /canDeleteConversation \? <button/);
assert.match(workspace, /<ConfirmDialog[\s\S]*title="Eliminar conversación"[\s\S]*El contacto y su información comercial no se eliminarán/);
assert.match(workspace, /if \(!selectedId \|\| !canDeleteConversation\) return/);
assert.match(workspace, /setRows\(\(current\) => current\.filter\(\(row\) => row\.id !== deletingId\)\)/);
assert.match(workspace, /setSelectedId\(undefined\)[\s\S]*setDetail\(null\)[\s\S]*setComposer\(""\)[\s\S]*setContextOpen\(false\)/);
assert.match(route, /export async function DELETE/);
assert.match(route, /resolveAppTenant\([\s\S]*requireWrite: true/);
assert.match(route, /canDeleteInboxConversation\(tenantContext\.ctx\)/);
assert.match(route, /tenantContext\.ctx\.portalActorId/);
assert.match(page, /canDeleteConversation=\{canDeleteInboxConversation\(ctx\)\}/);
assert.match(permissions, /role === "owner" \|\| role === "manager"/);
assert.match(permissions, /if \(isStaffRole\(context\.globalRole\)\) return false/);

// Approved scroll/composer surfaces stay in their existing components.
assert.match(chat, /app-scroll-surface min-h-0 flex-1 overflow-x-hidden overflow-y-auto/);
assert.match(chat, /<Composer/);
const deleteFlow = workspace.slice(workspace.indexOf('async function deleteSelectedConversation'), workspace.indexOf('async function deleteSelectedConversation') + 2200);
assert.doesNotMatch(deleteFlow, /window\.confirm/);

console.log('inbox-conversation-delete-ui.test.js passed');
