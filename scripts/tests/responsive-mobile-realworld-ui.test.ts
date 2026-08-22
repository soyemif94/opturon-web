import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { shouldAutoSelectFirstConversation, shouldStickInboxToBottom } = await import(
  pathToFileURL(path.join(root, "components/app/inbox/mobile-behavior.ts")).href
);

test("mobile starts in the conversation list while desktop preserves auto-selection", () => {
  assert.equal(shouldAutoSelectFirstConversation({ viewportWidth: 360, rowCount: 12 }), false);
  assert.equal(shouldAutoSelectFirstConversation({ viewportWidth: 430, rowCount: 12 }), false);
  assert.equal(shouldAutoSelectFirstConversation({ viewportWidth: 1366, rowCount: 12 }), true);
  assert.equal(shouldAutoSelectFirstConversation({ viewportWidth: 1366, selectedId: "conv-1", rowCount: 12 }), false);
});

test("message updates do not destroy historical reading position", () => {
  assert.equal(shouldStickInboxToBottom({ conversationChanged: true, distanceFromBottom: 500 }), true);
  assert.equal(shouldStickInboxToBottom({ conversationChanged: false, distanceFromBottom: 40 }), true);
  assert.equal(shouldStickInboxToBottom({ conversationChanged: false, distanceFromBottom: 120 }), false);
  assert.equal(shouldStickInboxToBottom({ conversationChanged: false, distanceFromBottom: 600 }), false);
});

test("Inbox owns a calculable viewport and separate list/messages scroll surfaces", () => {
  const shell = read("components/layout/app-shell.tsx");
  const layout = read("components/app/inbox/InboxLayout.tsx");
  const list = read("components/app/inbox/ConversationList.tsx");
  const chat = read("components/app/inbox/ChatPanel.tsx");
  assert.match(shell, /h-\[calc\(100dvh-1\.5rem\)\].*min-h-0 overflow-hidden/);
  assert.match(shell, /flex min-h-0 flex-1 flex-col overflow-hidden.*panel-glow/);
  assert.match(layout, /relative flex h-full min-h-0 flex-1 flex-col overflow-hidden/);
  assert.doesNotMatch(layout, /min-h-\[34rem\]|min-h-\[420px\]/);
  assert.match(list, /aria-label="Lista de conversaciones"/);
  assert.match(list, /touch-pan-y.*overflow-y-auto/);
  assert.match(list, /onSelectStart=\{\(\) => \{[\s\S]*?lastScrollTopRef\.current = scrollViewportRef\.current\.scrollTop/);
  assert.match(read("components/app/inbox/ConversationRow.tsx"), /onPointerDown=\{onSelectStart\}/);
  assert.match(chat, /aria-label="Mensajes de la conversación"/);
  assert.match(chat, /touch-pan-y.*overflow-y-auto/);
  assert.ok(chat.indexOf("<Composer") > chat.indexOf('aria-label="Mensajes de la conversación"'));
});

test("mobile list-chat-back flow and permission gates remain explicit", () => {
  const workspace = read("components/app/InboxWorkspace.tsx");
  const layout = read("components/app/inbox/InboxLayout.tsx");
  assert.match(workspace, /onSelect=\{\(id\) => \{[\s\S]*?openConversation\(id\)/);
  assert.match(workspace, /onBackToList=\{selectedId \? backToConversationList : undefined\}/);
  assert.match(workspace, /function closeMobileDetail\(\)[\s\S]*?setSelectedId\(undefined\)/);
  assert.match(layout, /Volver a conversaciones/);
  assert.match(workspace, /canDeleteConversation=\{canDeleteConversation && !readOnly\}/);
  assert.match(layout, /xl:grid-cols-\[minmax\(280px,320px\)_minmax\(0,1fr\)\]/);
});

test("mobile density variants preserve desktop content and operations", () => {
  const shell = read("components/layout/app-shell.tsx");
  const contacts = read("components/app/ContactsWorkspace.tsx");
  const agenda = read("components/app/agenda-workspace.tsx");
  assert.match(shell, /<span className="sm:hidden">Portal del cliente<\/span>/);
  assert.match(shell, /hidden sm:inline">Gestiona conversaciones/);
  assert.match(shell, /visibleNavItems\.map/);
  assert.match(shell, /hidden text-xs leading-5 text-muted sm:block/);
  assert.match(shell, /md:max-h-\[calc\(100dvh-2\.5rem\)\]/);
  assert.match(contacts, /grid grid-cols-2 gap-2\.5/);
  assert.match(contacts, /overflow-x-auto.*webkit-overflow-scrolling/);
  assert.match(contacts, /flex min-w-0 items-center justify-between.*sm:block/);
  for (const mode of ["month", "week", "day", "agenda"]) assert.match(agenda, new RegExp(`key: "${mode}"`));
  assert.match(agenda, /min-h-\[64px\].*md:min-h-\[132px\]/);
  assert.match(agenda, /onClick=\{\(\) => setSelectedDateKey\(day\.dateKey\)\}/);
});
