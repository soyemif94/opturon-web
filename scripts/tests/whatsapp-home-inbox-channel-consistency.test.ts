import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

const home = read("app/app/page.tsx");
const inbox = read("app/api/app/inbox/route.ts");
const integrations = read("app/app/integrations/page.tsx");

assert.match(home, /getPortalTenantContext\(ctx\.tenantId\)/);
assert.match(home, /getPortalConversations\(ctx\.tenantId, \{ channel: "whatsapp" \}\)/);
assert.match(inbox, /getPortalTenantContext\(tenantContext\.tenantId\)/);
assert.match(inbox, /getPortalConversations\(tenantContext\.tenantId, \{ visibility, channel \}\)/);
assert.match(integrations, /getPortalTenantContext\(ctx\.tenantId\)/);
assert.match(integrations, /getPortalWhatsAppStatus\(ctx\.tenantId\)/);

console.log("WhatsApp Home/Inbox/Integrations channel consistency: PASS");
