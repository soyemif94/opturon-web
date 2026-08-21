import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const globals = read("app/globals.css");
const list = read("components/app/inbox/ConversationList.tsx");
const chat = read("components/app/inbox/ChatPanel.tsx");
const layout = read("components/app/inbox/InboxLayout.tsx");
const shell = read("components/layout/app-shell.tsx");

// One native, theme-aware primitive supports Chromium/WebKit and Firefox.
assert.match(globals, /\.app-scroll-surface \{/);
assert.match(globals, /scrollbar-width: thin/);
assert.match(globals, /scrollbar-color: var\(--app-scrollbar-thumb\) transparent/);
assert.match(globals, /::-webkit-scrollbar-thumb/);
assert.match(globals, /::-webkit-scrollbar-track[\s\S]*?background: transparent/);
assert.match(globals, /scrollbar-gutter: stable/);
assert.doesNotMatch(globals, /app-scroll-surface[\s\S]{0,200}scrollbar-width: none/);

// Each column owns only its content scroll and blocks accidental horizontal scroll.
assert.match(list, /app-scroll-surface[^"]*overflow-x-hidden[^"]*overflow-y-auto/);
assert.match(list, /aria-label="Lista de conversaciones"/);
assert.match(chat, /ref=\{scrollViewportRef\}[\s\S]*?app-scroll-surface[^"]*overflow-x-hidden[^"]*overflow-y-auto/);
assert.match(chat, /aria-label="Mensajes de la conversación"/);
assert.equal((layout.match(/app-scroll-surface/g) || []).length, 2);
assert.match(layout, /aria-label="Contexto de la conversación"/);

// Header and composer stay outside the thread viewport; desktop shell owns viewport height.
const chatViewport = chat.indexOf("ref={scrollViewportRef}");
assert.ok(chat.indexOf("<header") < chatViewport);
assert.ok(chat.indexOf("<Composer") > chatViewport);
assert.match(shell, /isInboxRoute[\s\S]*?100dvh[\s\S]*?xl:overflow-hidden/);
assert.match(layout, /xl:h-full/);

console.log("inbox-scroll-surfaces-ui.test.ts passed");
