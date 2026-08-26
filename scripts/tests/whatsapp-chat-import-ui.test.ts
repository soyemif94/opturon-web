import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const modal = read("components/app/inbox/WhatsAppChatImportModal.tsx");
const dialog = read("components/ui/dialog.tsx");
const workspace = read("components/app/InboxWorkspace.tsx");
const previewRoute = read("app/api/app/whatsapp/imports/preview/route.ts");
const confirmRoute = read("app/api/app/whatsapp/imports/[importId]/confirm/route.ts");
const api = read("lib/api.ts");

assert.match(workspace, /WhatsAppChatImportModal/);
assert.match(modal, /Importar historial de WhatsApp/);
assert.match(modal, /<Dialog open=\{open\} onOpenChange=\{handleOpenChange\}>/);
assert.match(modal, /<DialogContent className="max-w-2xl rounded-\[24px\] bg-surface p-5 sm:p-6">/);
assert.match(modal, /<DialogClose asChild>/);
assert.match(modal, /aria-label="Cerrar importador"/);
assert.match(modal, /function handleOpenChange\(nextOpen: boolean\)/);
assert.match(modal, /if \(!nextOpen\) resetState\(\);/);
assert.match(dialog, /overflow-y-auto/);
assert.match(modal, /Esta importación sólo agrega historial\. No envía mensajes ni activa el bot\./);
assert.match(modal, /accept="\.txt,text\/plain"/);
assert.match(modal, /\/api\/app\/whatsapp\/imports\/preview/);
assert.match(modal, /\/api\/app\/whatsapp\/imports\/\$\{encodeURIComponent\(preview\.importId\)\}\/confirm/);
assert.match(modal, /selectedSelfParticipant/);
assert.match(modal, /Tu nombre en el chat exportado/);
assert.match(modal, /disabled=\{!canConfirm\}/);
assert.doesNotMatch(modal, /confirmImport\(\)\s*;?\s*}\s*}\s*>\s*Previsualizar/);

assert.match(previewRoute, /resolveAppTenant\(\{ requireWrite: true \}\)/);
assert.match(confirmRoute, /resolveAppTenant\(\{ requireWrite: true \}\)/);
assert.match(confirmRoute, /selectedSelfParticipant/);
assert.match(api, /previewPortalWhatsAppChatImport/);
assert.match(api, /confirmPortalWhatsAppChatImport/);
assert.match(api, /backendPortalFetch/);

console.log("whatsapp-chat-import-ui.test.ts passed");
