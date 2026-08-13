import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

function run() {
  const api = read("lib/api.ts");
  const helper = read("lib/admin-operational-alerts-canary-write-proxy.ts");
  const recipientsRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/recipients/route.ts");
  const recipientRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/recipients/[recipientId]/route.ts");
  const consentRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/recipients/[recipientId]/consent/route.ts");
  const recipientDisableRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/recipients/[recipientId]/disable/route.ts");
  const rulesRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/rules/route.ts");
  const ruleRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/rules/[ruleId]/route.ts");
  const ruleRecipientsRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/rules/[ruleId]/recipients/route.ts");
  const ruleEnableRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/rules/[ruleId]/enable/route.ts");
  const ruleDisableRoute = read("app/api/app/admin/clients/[tenantId]/operational-alerts/rules/[ruleId]/disable/route.ts");

  // The backend request stays on the Admin workspace and only the server adds
  // the selected tenant and resolved actor headers.
  assert.match(api, /method\?: "GET" \| "POST" \| "PATCH" \| "PUT"/);
  assert.match(api, /"x-portal-actor-id": safeActorUserId/);
  assert.match(api, /"x-active-tenant-id": safeTargetTenantId/);
  assert.match(api, /backendPortalFetch<T>/);
  assert.match(helper, /requireOpturonAdminApi\(\)/);
  assert.match(helper, /resolveOpturonAdminActorId\(guard\.ctx\)/);
  assert.match(helper, /TENANT_ID_PATTERN/);
  assert.match(helper, /UUID_PATTERN/);
  assert.match(helper, /hasNoQuery\(request\)/);
  assert.doesNotMatch(helper, /request\.headers|headers\.get\(/);

  // Strict create/consent/active contracts never accept a browser-provided
  // actor, active-at-create, consent-at-create, or unknown top-level fields.
  assert.match(helper, /RECIPIENT_CREATE_KEYS = new Set\(\["name", "phoneE164", "roleLabel", "areaKeys", "staffUserId"\]\)/);
  assert.match(helper, /isE164\(payload\.phoneE164\)/);
  assert.match(helper, /RECIPIENT_ACTIVE_KEYS = new Set\(\["active", "expectedVersion"\]\)/);
  assert.match(helper, /RECIPIENT_CONSENT_KEYS = new Set/);
  assert.match(helper, /payload\.status === "granted"/);
  assert.match(helper, /payload\.status === "revoked"/);
  assert.match(helper, /hasOnlyKeys\(payload, RECIPIENT_CREATE_KEYS\)/);

  // A canary rule is deliberately narrow: inventory-expiry only, disabled by
  // omission of enabled, with one-attempt delivery and one recipient link.
  const ruleKeys = helper.slice(helper.indexOf("const RULE_WRITE_KEYS"), helper.indexOf("const RULE_PATCH_KEYS"));
  assert.doesNotMatch(ruleKeys, /"enabled"|"archivedAt"|"clinicId"|"nextEvaluationAt"/);
  assert.match(helper, /INVENTORY_LOT_EXPIRING_EVENT_TYPE/);
  assert.match(helper, /INVENTORY_LOT_EXPIRING_TEMPLATE_KEY/);
  assert.match(helper, /conditions\.repeatPolicy !== "once_per_threshold"/);
  assert.match(helper, /deliveryPolicy\.maxAttempts !== 1/);
  assert.match(helper, /hasAllKeys\(payload, RULE_WRITE_KEYS\)/);
  assert.match(helper, /payload\.recipientIds\.length === 1/);
  assert.match(helper, /isUuid\(typeof payload\.recipientIds\[0\]/);
  assert.match(helper, /sanitizeOperationalAlertsPayload\(result\.data\)/);
  assert.doesNotMatch(helper, /graph\.facebook\.com|graph\.instagram\.com|whatsapp/i);

  assert.match(recipientsRoute, /export async function POST/);
  assert.match(recipientsRoute, /"recipientCreate"/);
  assert.match(recipientRoute, /export async function PATCH/);
  assert.match(recipientRoute, /"recipientActive"/);
  assert.match(consentRoute, /export async function POST/);
  assert.match(consentRoute, /"recipientConsent"/);
  assert.match(recipientDisableRoute, /export async function POST/);
  assert.match(recipientDisableRoute, /"recipientDisable"/);
  assert.match(rulesRoute, /export async function POST/);
  assert.match(rulesRoute, /"ruleCreate"/);
  assert.match(ruleRoute, /export async function PATCH/);
  assert.match(ruleRoute, /"ruleUpdate"/);
  assert.match(ruleRecipientsRoute, /export async function PUT/);
  assert.match(ruleRecipientsRoute, /"ruleRecipients"/);
  assert.match(ruleEnableRoute, /export async function POST/);
  assert.match(ruleEnableRoute, /"ruleEnable"/);
  assert.match(ruleDisableRoute, /export async function POST/);
  assert.match(ruleDisableRoute, /"ruleDisable"/);

  console.log("operational-alerts-admin-cross-tenant-write-proxy.test.ts: ok");
}

run();
