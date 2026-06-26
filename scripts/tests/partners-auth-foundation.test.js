const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function testAuthIncludesPartnerLoginAndHydration() {
  const source = read('lib/auth.ts');
  assert.match(source, /loginPartnerUser/);
  assert.match(source, /getPartnerAuthUserByEmail/);
  assert.match(source, /normalizePartnerAuthUser/);
  assert.match(source, /authIntent === "partner"/);
  assert.match(source, /partnerId/);
  assert.match(source, /isPartnerLikeIdentity/);
  assert.match(source, /tenantId = undefined/);
}

function testMiddlewareProtectsPartnersRoute() {
  const source = read('middleware.ts');
  assert.match(source, /path\.startsWith\("\/partners"\)/);
  assert.match(source, /isPartnerPortalHost/);
  assert.match(source, /partnerInternalPathForHostPath/);
  assert.match(source, /NextResponse\.rewrite/);
  assert.match(source, /isStrictPartnerToken/);
  assert.match(source, /clearAuthCookies/);
  assert.match(source, /matcher: \[.*\/partners\/:path\*/s);
}

function testPartnerPageExists() {
  const source = read('app/partners/page.tsx');
  const layoutSource = read('app/partners/layout.tsx');
  assert.match(source, /PartnerPortalWorkspace/);
  assert.match(layoutSource, /requirePartnerPage/);
  assert.match(layoutSource, /PartnerPortalShell/);
}

function testPartnerApiRoutesRequirePartnerGuard() {
  const accessSource = read('lib/saas/access.ts');
  assert.match(accessSource, /export async function requirePartnerApi/);
  assert.match(accessSource, /export function resolveAuthenticatedPartner/);
  assert.match(accessSource, /isStrictPartnerIdentity/);

  const summaryRoute = read('app/api/partners/me/summary/route.ts');
  const clientsRoute = read('app/api/partners/me/clients/route.ts');
  const rankRoute = read('app/api/partners/me/rank-progress/route.ts');
  const networkRoute = read('app/api/partners/me/network/route.ts');
  const commissionsRoute = read('app/api/partners/me/commissions/route.ts');
  const meRoute = read('app/api/partners/me/route.ts');

  assert.match(summaryRoute, /requirePartnerApi/);
  assert.match(clientsRoute, /requirePartnerApi/);
  assert.match(rankRoute, /requirePartnerApi/);
  assert.match(networkRoute, /requirePartnerApi/);
  assert.match(commissionsRoute, /requirePartnerApi/);
  assert.match(meRoute, /guard\.partnerId/);
  assert.match(summaryRoute, /guard\.partnerId/);
  assert.match(clientsRoute, /guard\.partnerId/);
  assert.match(rankRoute, /guard\.partnerId/);
  assert.match(networkRoute, /guard\.partnerId/);
  assert.match(commissionsRoute, /guard\.partnerId/);
  assert.doesNotMatch(meRoute, /session\?\.\s*user\?\.partnerId/);
  assert.doesNotMatch(summaryRoute, /session\?\.\s*user\?\.partnerId/);
  assert.doesNotMatch(clientsRoute, /session\?\.\s*user\?\.partnerId/);
  assert.doesNotMatch(rankRoute, /session\?\.\s*user\?\.partnerId/);
  assert.doesNotMatch(networkRoute, /session\?\.\s*user\?\.partnerId/);
  assert.doesNotMatch(commissionsRoute, /session\?\.\s*user\?\.partnerId/);
}

function run() {
  testAuthIncludesPartnerLoginAndHydration();
  testMiddlewareProtectsPartnersRoute();
  testPartnerPageExists();
  testPartnerApiRoutesRequirePartnerGuard();
  console.log('partners-auth-foundation.test.js: ok');
}

run();
