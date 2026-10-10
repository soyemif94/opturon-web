import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";

const projectRoot = process.cwd();
const source = readFileSync(join(projectRoot, "lib/ops/commercial-state.ts"), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: "transform" })).toString("base64")}`;
const { getLastCommercialActivityTimestamp, getOperationalAttentionState, isActiveCommercialFollowUp, isColdLead, isRecentlyCompletedFollowUp, isRecentlyReassigned } = await import(moduleUrl);

const now = new Date("2026-10-10T12:00:00.000Z");
const fourDaysAgo = "2026-10-06T12:00:00.000Z";
const base = {
  id: "conversation-a",
  status: "open",
  leadStatus: "NEW",
  lastMessageAt: fourDaysAgo,
  lastCommercialActivityAt: fourDaysAgo,
  priority: "normal",
  botEnabled: true,
  unreadCount: 0,
  slaMinutes: 0,
  nextActionAt: null,
  lastReassignedAt: null
};

assert.equal(isColdLead(base, now), true, "72h without a message, commercial intervention, unread activity, or follow-up is cold");
assert.equal(isColdLead({ ...base, leadStatus: "CLOSED" }, now), false, "closed records are not in the cold recovery queue");
assert.equal(isColdLead({ ...base, unreadCount: 1 }, now), false, "unread inbound work is not cold");
assert.equal(isColdLead({ ...base, nextActionAt: "2026-10-12T12:00:00.000Z" }, now), false, "a scheduled active follow-up excludes cold");
assert.equal(isActiveCommercialFollowUp({ ...base, nextActionAt: "2026-10-09T12:00:00.000Z" }), true, "an overdue follow-up remains active until explicitly cleared");

const recentlyReassigned = {
  ...base,
  lastCommercialActivityAt: fourDaysAgo,
  lastReassignedAt: "2026-10-10T11:00:00.000Z"
};
assert.equal(isRecentlyReassigned(recentlyReassigned, now), true);
assert.equal(getOperationalAttentionState(recentlyReassigned, now), "reassigned_recently");
assert.equal(isColdLead(recentlyReassigned, now), false, "recent reassignment excludes a stale lead from the recovery queue without changing its commercial activity timestamp");
assert.equal(getLastCommercialActivityTimestamp(recentlyReassigned), new Date(fourDaysAgo).getTime(), "reassignment does not fake commercial activity");
assert.equal(recentlyReassigned.leadStatus, "NEW", "operational state is separate from commercial stage");

const reassignedAgainCold = {
  ...base,
  lastCommercialActivityAt: fourDaysAgo,
  lastReassignedAt: fourDaysAgo
};
assert.equal(isRecentlyReassigned(reassignedAgainCold, now), false);
assert.equal(getOperationalAttentionState(reassignedAgainCold, now), "cold");
assert.equal(isColdLead(reassignedAgainCold, now), true, "reassigned leads can become cold again after the recovery window");

const notedRecently = { ...base, lastCommercialActivityAt: "2026-10-10T10:00:00.000Z" };
assert.equal(isColdLead(notedRecently, now), false, "a recent canonical commercial note/intervention resets staleness");
const completedFollowUp = {
  ...base,
  nextActionAt: null,
  commercialTimeline: [{
    id: "event-completed",
    type: "commercial_follow_up_completed",
    data: { previousFollowUpAt: "2026-10-09T12:00:00.000Z" },
    createdAt: "2026-10-10T10:00:00.000Z"
  }]
};
assert.equal(isRecentlyCompletedFollowUp(completedFollowUp, now), true);
assert.equal(isRecentlyCompletedFollowUp({ ...completedFollowUp, nextActionAt: "2026-10-12T12:00:00.000Z" }, now), false, "a newly scheduled follow-up supersedes the completed queue state");

const dashboard = readFileSync(join(projectRoot, "components/app/ops/OpsDashboard.tsx"), "utf8");
const table = readFileSync(join(projectRoot, "components/app/ops/OpsLeadTable.tsx"), "utf8");
const inbox = readFileSync(join(projectRoot, "components/app/InboxWorkspace.tsx"), "utf8");
const assignRoute = readFileSync(join(projectRoot, "app/api/app/inbox/[id]/assign-seller/route.ts"), "utf8");
const opsPage = readFileSync(join(projectRoot, "app/app/ops/page.tsx"), "utf8");
const inboxPage = readFileSync(join(projectRoot, "app/app/inbox/page.tsx"), "utf8");
const profilePanel = readFileSync(join(projectRoot, "components/app/inbox/ProfilePanel.tsx"), "utf8");
const nextActionRoute = readFileSync(join(projectRoot, "app/api/app/inbox/[id]/next-action/route.ts"), "utf8");
assert.match(dashboard, /import \{ isActiveCommercialFollowUp, isColdLead, isRecentlyCompletedFollowUp \} from "@\/lib\/ops\/commercial-state"/);
assert.match(table, /import \{ isColdLead, isRecentlyReassigned \} from "@\/lib\/ops\/commercial-state"/);
assert.match(dashboard, /await loadOpsData\(\{ silent: true \}\)/, "assignment refetches canonical backend data");
assert.doesNotMatch(dashboard, /leadStatus: row\.leadStatus === "NEW" \? "IN_CONVERSATION"/);
assert.doesNotMatch(inbox, /leadStatus: row\.leadStatus === "NEW" \? "IN_CONVERSATION"/);
assert.doesNotMatch(assignRoute, /conversation\.leadStatus = "IN_CONVERSATION"/);
assert.match(table, /Historial comercial/);
assert.match(table, /Reasignado a/);
assert.match(dashboard, /Seguimientos futuros/);
assert.match(dashboard, /Seguimientos completados recientemente/);
assert.match(dashboard, /completed: true/);
assert.match(opsPage, /canManageWorkspace/);
assert.match(inboxPage, /canReassignConversations=\{canManageWorkspace\(ctx\)\}/);
assert.match(profilePanel, /disabled=\{readOnly \|\| !canReassignConversations\}/);
assert.match(assignRoute, /tenantContext\.ctx\?\.portalActorId \|\| tenantContext\.ctx\?\.userId/);
assert.match(nextActionRoute, /"x-portal-actor-id": actorUserId/);
assert.match(inboxPage, /currentUserId=\{ctx\.portalActorId \|\| ctx\.userId\}/);

console.log("ops-commercial-state.test.mjs passed");
