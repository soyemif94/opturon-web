import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";

const projectRoot = process.cwd();
const accessSource = readFileSync(join(projectRoot, "lib/inbox-channel-access.ts"), "utf8");
const accessModule = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(accessSource, { mode: "transform" })).toString("base64")}`
);
const { hasInboxChannel, resolveInitialInboxChannel } = accessModule;

function assertMatrix(availability, expectedChannel, expectedAccess) {
  assert.equal(hasInboxChannel(availability), expectedAccess);
  assert.equal(resolveInitialInboxChannel("whatsapp", availability), expectedChannel);
}

assertMatrix({ whatsapp: false, instagram: true }, "instagram", true);
assertMatrix({ whatsapp: true, instagram: false }, "whatsapp", true);
assertMatrix({ whatsapp: true, instagram: true }, "whatsapp", true);
assertMatrix({ whatsapp: false, instagram: false }, "whatsapp", false);

const routeSource = readFileSync(join(projectRoot, "app/api/app/inbox/route.ts"), "utf8");
const workspaceSource = readFileSync(join(projectRoot, "components/app/InboxWorkspace.tsx"), "utf8");

assert.match(routeSource, /getPortalInstagramStatus\(tenantContext\.tenantId\)/);
assert.match(routeSource, /availableChannels/);
assert.match(routeSource, /hasOperationalWhatsAppChannel\(channelState\)/);
assert.match(workspaceSource, /resolveInitialInboxChannel\(channel, nextAvailableChannels\)/);
assert.match(workspaceSource, /!hasInboxChannel\(availableChannels\)/);
assert.match(workspaceSource, /initialChannelResolvedRef\.current = true/);

console.log("inbox-multichannel-access-gate.test.mjs: ok");
