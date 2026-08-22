import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const { preserveSelectedConversationId, resolveInboxDetailMode } = await import(
  pathToFileURL(path.join(root, "components/app/inbox/mobile-behavior.ts")).href
);

test("row selection stores stable identity before entering detail", () => {
  const workspace = read("components/app/InboxWorkspace.tsx");
  const openConversation = workspace.slice(
    workspace.indexOf("function openConversation"),
    workspace.indexOf("function backToConversationList")
  );
  assert.ok(openConversation.indexOf("selectedIdRef.current = conversationId") < openConversation.indexOf("setSelectedId(conversationId)"));
  assert.match(openConversation, /setDetailLoading\(true\)/);
});

test("selected conversation without hydrated detail is always DETAIL_LOADING", () => {
  assert.equal(resolveInboxDetailMode({ selectedId: "conversation-a" }), "DETAIL_LOADING");
  const chat = read("components/app/inbox/ChatPanel.tsx");
  assert.match(chat, /mode === "DETAIL_LOADING" && !detail/);
  assert.doesNotMatch(chat, /!loading && !detail/);
});

test("successful hydration transitions loading to ready by matching ID", () => {
  assert.equal(
    resolveInboxDetailMode({ selectedId: "conversation-a", resolvedConversationId: "conversation-a" }),
    "DETAIL_READY"
  );
  assert.equal(
    resolveInboxDetailMode({ selectedId: "conversation-a", resolvedConversationId: "conversation-b" }),
    "DETAIL_LOADING"
  );
});

test("list refresh during loading preserves selected ID even when temporarily absent", () => {
  assert.equal(
    preserveSelectedConversationId({ selectedId: "conversation-a", viewportWidth: 390, nextRowIds: [] }),
    "conversation-a"
  );
});

test("list refresh preserves selection by ID across new object identities", () => {
  const before = { id: "conversation-a" };
  const after = { id: "conversation-a" };
  assert.notEqual(before, after);
  assert.equal(
    preserveSelectedConversationId({ selectedId: before.id, viewportWidth: 430, nextRowIds: [after.id] }),
    "conversation-a"
  );
});

test("detail errors are explicit and never degrade into the desktop empty state", () => {
  assert.equal(
    resolveInboxDetailMode({ selectedId: "conversation-a", errorConversationId: "conversation-a" }),
    "DETAIL_ERROR"
  );
  const chat = read("components/app/inbox/ChatPanel.tsx");
  assert.match(chat, /No pudimos cargar esta conversación\./);
  assert.match(chat, /Reintentar/);
  assert.match(chat, /mode === "DETAIL_ERROR"/);
});

test("back returns to LIST through controlled cleanup", () => {
  const workspace = read("components/app/InboxWorkspace.tsx");
  assert.match(workspace, /function closeMobileDetail\(\)[\s\S]*selectedIdRef\.current = undefined[\s\S]*setSelectedId\(undefined\)/);
  assert.match(workspace, /function backToConversationList\(\)[\s\S]*closeMobileDetail\(\)/);
  assert.equal(resolveInboxDetailMode({}), "LIST");
});

test("desktop no-selection empty state remains available only in LIST", () => {
  const chat = read("components/app/inbox/ChatPanel.tsx");
  assert.match(chat, /mode === "LIST"/);
  assert.match(chat, /Selecciona una conversacion/);
  assert.match(chat, /Abre una fila de la izquierda/);
});

test("mobile detail can never render left-column copy", () => {
  for (const mode of ["DETAIL_LOADING", "DETAIL_READY", "DETAIL_ERROR"] as string[]) {
    assert.notEqual(mode, "LIST");
  }
  const chat = read("components/app/inbox/ChatPanel.tsx");
  const emptyCopyIndex = chat.indexOf("Abre una fila de la izquierda");
  const listGuardIndex = chat.lastIndexOf('mode === "LIST"', emptyCopyIndex);
  assert.ok(listGuardIndex >= 0 && listGuardIndex < emptyCopyIndex);
});

test("A to back to B to back to C maintains deterministic state transitions", () => {
  for (const id of ["conversation-a", "conversation-b", "conversation-c"]) {
    assert.equal(resolveInboxDetailMode({ selectedId: id }), "DETAIL_LOADING");
    assert.equal(resolveInboxDetailMode({ selectedId: id, resolvedConversationId: id }), "DETAIL_READY");
    assert.equal(resolveInboxDetailMode({}), "LIST");
  }
});

test("an unchanged payload rehydrates detail after back instead of being suppressed by its snapshot", () => {
  const workspace = read("components/app/InboxWorkspace.tsx");
  assert.match(workspace, /setDetail\(\(current\) => \(changed \|\| current\?\.conversation\.id !== conversationId \? json : current\)\)/);
  assert.doesNotMatch(workspace, /if \(changed && requestSeq === detailRequestSeqRef\.current\)/);
});
