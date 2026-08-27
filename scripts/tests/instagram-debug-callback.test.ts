import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const route = readFileSync(
  join(root, "app/api/app/integrations/instagram/debug-callback/route.ts"),
  "utf8"
);

assert.match(route, /export async function GET\(request: NextRequest\)/);
assert.match(route, /searchParams\.get\("code"\)/);
assert.match(route, /INSTAGRAM_OAUTH_CODE_CAPTURED=/);
assert.match(route, /Cache-Control.*no-store/);
assert.doesNotMatch(route, /console\.(log|info|warn|error)/);
assert.doesNotMatch(route, /fetch\(/);
assert.doesNotMatch(route, /connectPortalInstagram|accessToken|client_secret|database|INSERT|UPDATE|DELETE/);
assert.match(route, /operator can copy it from the browser URL/);

console.log("instagram-debug-callback.test.ts: ok");
