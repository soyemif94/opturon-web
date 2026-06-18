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
  assert.match(source, /partnerId/);
  assert.match(source, /tokenGlobalRole === "partner"/);
}

function testMiddlewareProtectsPartnersRoute() {
  const source = read('middleware.ts');
  assert.match(source, /path\.startsWith\("\/partners"\)/);
  assert.match(source, /globalRole !== "partner"/);
  assert.match(source, /globalRole === "partner"/);
  assert.match(source, /matcher: \[.*\/partners\/:path\*/s);
}

function testPartnerPageExists() {
  const source = read('app/partners/page.tsx');
  assert.match(source, /requirePartnerPage/);
  assert.match(source, /Partner Portal/);
}

function run() {
  testAuthIncludesPartnerLoginAndHydration();
  testMiddlewareProtectsPartnersRoute();
  testPartnerPageExists();
  console.log('partners-auth-foundation.test.js: ok');
}

run();
