import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

const page = read("app/app/integrations/page.tsx");
const route = read("app/api/app/integrations/instagram/route.ts");
const api = read("lib/api.ts");
const hub = read("components/app/integrations-hub.tsx");
const client = read("components/app/client-integrations-experience.tsx");
const dialog = read("components/ui/dialog.tsx");

assert.match(page, /requireAppPage\(\{ permission: "manage_workspace" \}\)/);
assert.match(route, /export async function DELETE/);
assert.match(route, /requireAppApi\(\{ permission: "manage_workspace" \}\)/);
assert.match(route, /disconnectPortalInstagram\(auth\.ctx\.tenantId, \{ channelId \}\)/);
assert.match(api, /\/portal\/tenants\/\$\{tenantId\}\/instagram\/disconnect/);

assert.match(client, /Desconectar Instagram/);
assert.match(client, /¿Desconectar \$\{instagramUsername\}\?/);
assert.match(client, /Tus conversaciones e historial no se eliminarán/);
assert.match(client, /variant="destructive"/);
assert.match(client, /onConfirm=\{onDisconnectInstagram\}/);
assert.match(dialog, /<DialogClose asChild>[\s\S]*\{cancelText\}/);

assert.match(hub, /method: "DELETE"/);
assert.match(hub, /body: JSON\.stringify\(\{ channelId \}\)/);
assert.match(hub, /await refreshInstagramStatus\(\)/);
assert.match(hub, /instagram=disconnected/);
assert.doesNotMatch(route, /accessToken|client_secret|credential/);

console.log("instagram-disconnect-lifecycle-ui.test.ts: ok");
