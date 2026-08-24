import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const workspace = read("components/app/InboxWorkspace.tsx");
const chat = read("components/app/inbox/ChatPanel.tsx");
const profile = read("components/app/inbox/ProfilePanel.tsx");
const listRoute = read("app/api/app/inbox/route.ts");
const detailRoute = read("app/api/app/inbox/[id]/route.ts");

// Existing data flow, polling, channel behavior and mutations remain in place.
assert.match(workspace, /appendQuery\("\/api\/app\/inbox"/);
assert.match(workspace, /appendQuery\(`\/api\/app\/inbox\/\$\{conversationId\}`\)/);
assert.match(workspace, /setTimeout\(\(\) => void tick\(\), 5000\)/);
assert.match(workspace, /mark_read/);
assert.match(workspace, /sendMessage\(composer\)/);
assert.match(workspace, /runAction\("toggle_bot"\)/);
assert.match(workspace, /runAction\("close"\)/);
assert.match(workspace, /takeConversation\(\)/);
assert.match(workspace, /changeBotFlowLock/);
assert.match(workspace, /changeBotDomainOverride/);
assert.match(chat, /isInstagramConversation/);
assert.match(chat, /composerCapability/);
assert.match(chat, /readOnly \|\| sending \|\| !composerReady/);
assert.match(chat, /disabled=\{isComposerDisabled\}/);

// Permissions/read-only and every contextual edit remain guarded.
assert.match(profile, /disabled=\{readOnly\}/);
assert.match(profile, /disabled=\{readOnly \|\| resetBusy\}/);
assert.match(profile, /onLeadStatusChange/);
assert.match(profile, /onSaveNextAction/);
assert.match(profile, /onAddNote/);
assert.match(profile, /onAddTask/);

// BFF retains tenant resolution, backend contracts and existing channel filters.
assert.match(listRoute, /resolveAppTenant/);
assert.match(listRoute, /getPortalConversations\(tenantContext\.tenantId, \{ visibility, channel \}\)/);
assert.match(listRoute, /Cache-Control": "no-store"/);
assert.match(detailRoute, /getPortalConversationDetail\(tenantContext\.tenantId, id\)/);
assert.match(detailRoute, /patchPortalConversation\(tenantContext\.tenantId, id/);
assert.doesNotMatch(workspace, /profileImageUrl[\s\S]{0,200}fetch/);

console.log("inbox-uiux-functional-contract.test.ts passed");
