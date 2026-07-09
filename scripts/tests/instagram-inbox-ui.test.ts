import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testInboxApiForwardsChannelFilter() {
  const routeSource = read("app/api/app/inbox/route.ts");
  const apiSource = read("lib/api.ts");

  assert.match(routeSource, /channel: z\.enum\(\["whatsapp", "instagram"\]\)\.optional\(\)/);
  assert.match(routeSource, /const channel = params\.channel \|\| "whatsapp"/);
  assert.match(routeSource, /getPortalConversations\(tenantContext\.tenantId, \{ visibility, channel \}\)/);
  assert.match(routeSource, /conversation\.channelType \|\| "whatsapp"/);
  assert.match(apiSource, /channel\?: "whatsapp" \| "instagram"/);
  assert.match(apiSource, /params\.set\("channel", options\.channel\)/);
}

function testInboxTabsAndEmptyState() {
  const listSource = read("components/app/inbox/ConversationList.tsx");
  const workspaceSource = read("components/app/InboxWorkspace.tsx");

  assert.match(listSource, /WhatsApp/);
  assert.match(listSource, /Instagram/);
  assert.match(listSource, /Todavia no hay conversaciones de Instagram/);
  assert.match(listSource, /Cuando conectes Instagram y recibas mensajes, van a aparecer aca/);
  assert.match(workspaceSource, /const \[channel, setChannel\] = useState<InboxChannelKey>\("whatsapp"\)/);
  assert.match(workspaceSource, /channel\s*\}/);
  assert.match(workspaceSource, /onChannelChange=\{\(value\) =>/);
}

function testInstagramReadOnlyComposer() {
  const chatSource = read("components/app/inbox/ChatPanel.tsx");
  const workspaceSource = read("components/app/InboxWorkspace.tsx");
  const rowSource = read("components/app/inbox/ConversationRow.tsx");

  assert.match(chatSource, /isInstagramConversation = detail\?\.conversation\.channelType === "instagram"/);
  assert.match(chatSource, /Instagram esta disponible en modo lectura en esta etapa/);
  assert.match(chatSource, /disabled=\{isComposerDisabled\}/);
  assert.match(chatSource, /quickReplies=\{isInstagramConversation \? \[\] : detail\.quickReplies\}/);
  assert.match(workspaceSource, /detail\.conversation\.channelType === "instagram"/);
  assert.match(workspaceSource, /Respuesta desde Instagram todavia no disponible/);
  assert.match(rowSource, /row\.channelType === "instagram"/);
  assert.match(rowSource, /Lectura/);
}

function run() {
  testInboxApiForwardsChannelFilter();
  testInboxTabsAndEmptyState();
  testInstagramReadOnlyComposer();
  console.log("instagram-inbox-ui.test.ts: ok");
}

run();
