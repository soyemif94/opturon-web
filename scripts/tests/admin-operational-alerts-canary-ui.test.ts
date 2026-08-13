import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");
const gates = await import(pathToFileURL(join(root, "lib/admin-operational-alerts-canary-ui.ts")).href);

const page = read("app/app/admin/operational-alerts/page.tsx");
const workspace = read("components/app/admin-operational-alerts-workspace.tsx");
const readProxy = read("lib/admin-operational-alerts-read-proxy.ts");
const historyDetailRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/history/[instanceId]/route.ts");
const api = read("lib/api.ts");
const navigation = read("components/layout/app-shell.tsx");

const rule = {
  id: "bd59ef4b-a0ca-4256-ba7b-f9f922345835",
  name: "Opturon Canary — Inventory expiry",
  eventType: "inventory.lot_expiring",
  eventVersion: 1,
  enabled: false,
  configVersion: 3,
  deliveryPolicy: { maxAttempts: 1 }
};

function baselinePreflight() {
  return {
    operationalAlertsEnabled: false,
    enabledRules: { count: 0 },
    recipients: { count: 1, ready: true },
    template: { ready: true },
    channel: { ready: true },
    deliveryPolicy: { maxAttempts: 1 },
    worker: { health: "healthy" },
    backlog: { pending: 0, processing: 0, retryable: 0, unknownDelivery: 0 },
    candidatePreview: {
      evaluable: true,
      candidateCount: 1,
      expectedEventCount: 1,
      expectedDigestCount: 1,
      digestItemCount: 1,
      truncated: false
    },
    reasons: [
      "OPERATIONAL_ALERTS_DISABLED",
      "ENABLED_RULE_COUNT_NOT_ONE",
      "CANARY_RULE_DISABLED",
      "RULE_NOT_READY",
      "RULE_BLOCKER_FEATURE_DISABLED"
    ]
  };
}

const checks: Array<[string, () => void]> = [
  ["Admin-only page and server-resolved selector", () => {
    assert.match(page, /requireOpturonAdminPage\("\/app\/admin\/operational-alerts"\)/);
    assert.match(page, /adminWorkspaceTenantId/);
    assert.match(page, /source: "admin_workspace"/);
    assert.match(page, /getAdminTenantPolicies/);
    assert.match(navigation, /href: "\/app\/admin\/operational-alerts"/);
    assert.match(navigation, /label: "Canario de alertas"/);
    assert.match(navigation, /accountScope === "opturon_admin"/);
  }],
  ["Cross-tenant requests never use tenant-local proxy or client secrets", () => {
    assert.match(workspace, /\/api\/app\/admin\/clients\/\$\{encodeURIComponent\(tenantId\)\}\/operational-alerts/);
    assert.doesNotMatch(workspace, /\/api\/app\/operational-alerts\$\{path\}/);
    assert.doesNotMatch(workspace, /PORTAL_INTERNAL_KEY|x-portal-key|x-portal-actor-id|x-active-tenant-id/);
    assert.match(readProxy, /requireOpturonAdminApi\(\)/);
    assert.match(readProxy, /resolveOpturonAdminActorId\(ctx\)/);
    assert.match(api, /"x-portal-actor-id": safeActorUserId/);
    assert.match(api, /"x-active-tenant-id": safeTargetTenantId/);
  }],
  ["Baseline gates require the exact intentional OFF state and controlled rule", () => {
    const baseline = baselinePreflight();
    assert.equal(gates.canActivateCanary(baseline, rule), true);
    assert.equal(gates.canActivateCanary({ ...baseline, worker: { health: "stale" } }, rule), false);
    assert.equal(gates.canActivateCanary({ ...baseline, backlog: { ...baseline.backlog, pending: 1 } }, rule), false);
    assert.equal(gates.canActivateCanary({ ...baseline, template: { ready: false } }, rule), false);
    assert.equal(gates.canActivateCanary({ ...baseline, channel: { ready: false } }, rule), false);
    assert.equal(gates.canActivateCanary({ ...baseline, recipients: { count: 2, ready: true } }, rule), false);
    assert.equal(gates.canActivateCanary({ ...baseline, candidatePreview: { ...baseline.candidatePreview, candidateCount: 0 } }, rule), false);
    assert.equal(gates.canActivateCanary({ ...baseline, deliveryPolicy: { maxAttempts: 2 } }, rule), false);
    assert.equal(gates.canActivateCanary({ ...baseline, reasons: [...baseline.reasons, "UNEXPECTED"] }, rule), false);
    assert.equal(gates.canActivateCanary(baseline, { ...rule, name: "Other rule" }), false);
    assert.equal(gates.canActivateCanary(baseline, { ...rule, enabled: true }), false);
    assert.match(workspace, /disabled=\{!activationAllowed \|\| activeCanaryScope !== null \|\| busy !== null\}/);
  }],
  ["Post-switch and post-enable gates remain fail-closed", () => {
    const postSwitch = {
      ...baselinePreflight(),
      operationalAlertsEnabled: true,
      reasons: ["CANARY_RULE_DISABLED", "ENABLED_RULE_COUNT_NOT_ONE"]
    };
    assert.equal(gates.canEnableAfterSwitch(postSwitch, rule), true);
    assert.equal(gates.canEnableAfterSwitch({ ...postSwitch, reasons: [...postSwitch.reasons, "WORKER_NOT_HEALTHY"] }, rule), false);
    assert.equal(gates.canEnableAfterSwitch({ ...postSwitch, worker: { health: "error" } }, rule), false);
    const active = { ...postSwitch, enabledRules: { count: 1 }, reasons: [], canarySafe: true };
    assert.equal(gates.isActiveCanaryConfirmed(active, { ...rule, enabled: true }), true);
    assert.equal(gates.isActiveCanaryConfirmed({ ...active, canarySafe: false }, { ...rule, enabled: true }), false);
  }],
  ["Activation is human-confirmed, ordered, pinned, and contains uncertain writes", () => {
    assert.match(workspace, /Confirmo que revis/);
    assert.match(workspace, /disabled=\{!activationAcknowledged \|\| !activationAllowed \|\| busy !== null\}/);
    const switchMark = workspace.indexOf("switchPossiblyTouched = true");
    const switchOn = workspace.indexOf("await updateSwitchForTenant(scope.tenantId, true)", switchMark);
    const recheck = workspace.indexOf("const afterSwitch = await loadSnapshot", switchOn);
    const enable = workspace.indexOf("/enable`, {", recheck);
    assert.ok(switchMark >= 0 && switchOn > switchMark && recheck > switchOn && enable > recheck);
    assert.match(workspace, /isActiveCanaryConfirmed\(activeSnapshot\.preflight/);
    assert.match(workspace, /setActiveCanaryScope\(scope\)/);
    assert.match(workspace, /containCanary\(scope\.tenantId, scope\.ruleId\)/);
    assert.match(workspace, /A failed write response is ambiguous/);
  }],
  ["Stop refreshes the pinned rule, turns rule OFF before switch OFF, and verifies both", () => {
    const freshRead = workspace.indexOf("const currentRule = await loadCurrentRule");
    const disable = workspace.indexOf("/disable`, {", freshRead);
    const switchOff = workspace.indexOf("await updateSwitchForTenant(tenantId, false)", disable);
    assert.ok(freshRead >= 0 && disable > freshRead && switchOff > disable);
    assert.match(workspace, /const scope = activeCanaryScope \|\| fallbackScope/);
    assert.match(workspace, /disabled=\{canaryScopeLocked \|\| busy !== null \|\| tenants\.length === 0\}/);
    assert.match(workspace, /disabled=\{canaryScopeLocked \|\| busy !== null\}/);
    assert.match(workspace, /finalRule\?\.enabled === false/);
    assert.match(workspace, /finalSettings\?\.operationalAlertsEnabled === false/);
    assert.match(workspace, /if \(!containment\.confirmed\)/);
    assert.match(workspace, /DETENER CANARIO/);
  }],
  ["No auto activation, scheduler, retry, Meta, or WhatsApp send", () => {
    assert.match(workspace, /This effect performs GETs only/);
    assert.match(workspace, /void refreshSelectedTenant\(\{ quiet: true \}\)/);
    assert.doesNotMatch(workspace, /setInterval|setTimeout|\/retry\b|graph\.facebook\.com|whatsapp\.com\/send/i);
    assert.doesNotMatch(workspace, /createRecipient|createRule|DELETE/);
  }],
  ["Recipient association and consent remain explicit scoped mutations", () => {
    assert.match(workspace, /recipientIds: \[selectedRecipient\.id\]/);
    assert.match(workspace, /expectedConfigVersion: selectedRule\.configVersion/);
    assert.match(workspace, /consentSource: "opturon_admin_manual_confirmation"/);
    assert.match(workspace, /expectedVersion: recipient\.version/);
  }],
  ["History detail reuses the existing backend endpoint through an Admin-only sanitized proxy", () => {
    assert.match(historyDetailRoute, /proxyAdminTenantOperationalAlertsHistoryDetail/);
    assert.match(readProxy, /\/history\/\$\{encodeURIComponent\(safeInstanceId\)\}/);
    assert.match(readProxy, /UUID_PATTERN/);
    assert.match(readProxy, /sanitizeOperationalAlertsPayload\(result\.data\)/);
    assert.match(workspace, /\/history\/\$\{encodeURIComponent\(instanceId\)\}/);
    assert.match(workspace, /attemptCount/);
    assert.match(workspace, /deliveredAt/);
    assert.match(workspace, /Error sanitizado/);
  }]
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}

console.log(`admin-operational-alerts-canary-ui.test.ts passed (${checks.length} checks)`);
