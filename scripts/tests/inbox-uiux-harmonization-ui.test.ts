import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const workspace = read("components/app/InboxWorkspace.tsx");
const layout = read("components/app/inbox/InboxLayout.tsx");
const list = read("components/app/inbox/ConversationList.tsx");
const row = read("components/app/inbox/ConversationRow.tsx");
const chat = read("components/app/inbox/ChatPanel.tsx");
const message = read("components/app/inbox/MessageBubble.tsx");
const composer = read("components/app/inbox/Composer.tsx");
const profile = read("components/app/inbox/ProfilePanel.tsx");
const avatar = read("components/app/simple-avatar.tsx");

// Conversation list: dense rows, selection, real avatar/fallback, channel and unread.
assert.match(list, /aria-label="Buscar conversaciones"/);
assert.match(list, /WhatsApp/);
assert.match(list, /Instagram/);
assert.match(list, /FILTERS\.map/);
assert.match(list, /Limpiar filtros/);
assert.match(list, /loading && hasLoaded/);
assert.match(list, /Actualizando…/);
assert.match(row, /rounded-xl border px-2\.5 py-2\.5/);
assert.match(row, /aria-current=\{selected \? "true"/);
assert.match(row, /profileImageUrl/);
assert.match(row, /mensajes sin leer/);
assert.match(row, /channelType === "instagram"/);
assert.match(row, /row\.importedHistory/);
assert.match(row, /payment_pending_validation/);
assert.match(row, /Más acciones para/);
assert.match(avatar, /safeSrc \?/);
assert.match(avatar, /initials\(label\)/);

// Chat: compact operational header, bot state/action, messages and composer.
assert.match(chat, /Pausar bot para esta conversación/);
assert.match(chat, /Retomar bot para esta conversación/);
assert.match(chat, /detail\.conversation\.botEnabled \? "bg-emerald-400" : "bg-amber-400"/);
assert.match(chat, /Abrir contexto del contacto/);
assert.match(chat, /Más acciones/);
assert.match(chat, /Esta conversación todavía no tiene mensajes/);
assert.match(chat, /Actualizando conversacion/);
assert.match(message, /max-w-\[78%\]/);
assert.match(message, /direction === "outbound"/);
assert.match(message, /aria-label="Leído"/);
assert.match(message, /aria-label="Entregado"/);
assert.match(composer, /rows=\{1\}/);
assert.match(composer, /aria-label="Abrir templates"/);
assert.match(composer, /aria-label="Enviar mensaje"/);
assert.match(composer, /Enter envía/);

// Context and responsive contracts: persistent at 2xl, drawer below, single-column mobile.
assert.match(profile, /Identidad y estado/);
assert.match(profile, /Configuracion del bot/);
assert.match(profile, /Responsable actual/);
assert.match(profile, /Proxima accion/);
assert.match(profile, /Notas/);
assert.match(profile, /Tareas/);
assert.match(layout, /xl:grid-cols-\[minmax\(300px,0\.78fr\)_minmax\(0,1\.72fr\)\]/);
assert.match(layout, /2xl:grid-cols-\[minmax\(320px,0\.82fr\)_minmax\(0,1\.58fr\)_minmax\(300px,0\.76fr\)\]/);
assert.match(layout, /role="dialog"/);
assert.match(layout, /aria-modal="true"/);
assert.match(layout, /2xl:hidden/);
assert.match(layout, /Volver a conversaciones/);
assert.match(workspace, /contextOpen=\{contextOpen\}/);
assert.match(workspace, /setContextOpen\(false\)/);

console.log("inbox-uiux-harmonization-ui.test.ts passed");
