import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const route = readFileSync(
  join(root, "app/api/app/integrations/instagram/debug-callback/route.ts"),
  "utf8"
);
const api = readFileSync(join(root, "lib/api.ts"), "utf8");

assert.match(route, /export async function GET\(request: NextRequest\)/);
assert.match(route, /requireAppApi\(\{ permission: "manage_workspace" \}\)/);
assert.match(route, /DIAGNOSTIC_REVIEWER_TENANT_ID/);
assert.match(route, /auth\.ctx\.tenantId !== DIAGNOSTIC_REVIEWER_TENANT_ID/);
assert.match(route, /searchParams\.get\("code"\)/);
assert.match(route, /runPortalInstagramDirectExchangeDiagnostic\(code\)/);
assert.match(route, /INSTAGRAM_DIRECT_EXCHANGE_DIAGNOSTIC/);
assert.match(route, /ROOT_CAUSE_BOUNDARY=/);
assert.match(route, /Cache-Control.*no-store/);
assert.doesNotMatch(route, /console\.(log|info|warn|error)/);
assert.doesNotMatch(route, /connectPortalInstagram|access_token|client_secret|database|INSERT|UPDATE|DELETE/);
assert.match(api, /runPortalInstagramDirectExchangeDiagnostic/);
assert.match(api, /"\/portal\/instagram\/debug-direct-exchange"/);
assert.match(api, /body: JSON\.stringify\(\{ code \}\)/);

console.log("instagram-debug-callback.test.ts: ok");
