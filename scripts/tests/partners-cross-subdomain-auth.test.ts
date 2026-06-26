import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testPartnerLoginDoesNotUseClientResolver() {
  const auth = read("lib/auth.ts");
  const loginForm = read("components/login-form.tsx");
  const loginScreen = read("components/auth/LoginScreen.tsx");

  assert.match(loginForm, /authIntent/);
  assert.match(loginForm, /signIn\("credentials"/);
  assert.match(loginForm, /Esta cuenta no tiene acceso al Portal de asesores/);
  assert.match(loginScreen, /authIntent="partner"/);
  assert.match(loginScreen, /if \(partnerHost\) return true/);
  assert.match(auth, /if \(authIntent === "partner"\)/);
  assert.match(auth, /loginPartnerUser\(email, password\)/);
  assert.match(auth, /return normalizePartnerAuthUser\(response\.data\)/);
  assert.match(auth, /AUTH_PORTAL_LOGIN_RETURNED_PARTNER_SCOPE/);
}

function testPartnerSessionIsStrictAndTenantless() {
  const identity = read("lib/auth-identity.ts");
  const auth = read("lib/auth.ts");
  const access = read("lib/saas/access.ts");

  assert.match(identity, /export function isStrictPartnerIdentity/);
  assert.match(identity, /!String\(input\.tenantId/);
  assert.match(identity, /!String\(input\.tenantRole/);
  assert.match(auth, /tokenPartnerLike/);
  assert.match(auth, /getPartnerAuthUserByEmail/);
  assert.match(auth, /token\.tenantId = undefined/);
  assert.match(auth, /session\.user\.tenantId = undefined/);
  assert.match(auth, /session\.user\.tenantRole = undefined/);
  assert.match(access, /isStrictPartnerIdentity/);
  assert.match(access, /resolveAppTenant/);
  assert.match(access, /isPartnerLikeIdentity/);
}

function testPartnerHostRejectsClientCookie() {
  const middleware = read("middleware.ts");

  assert.match(middleware, /isPartnerPortalHost/);
  assert.match(middleware, /isStrictPartnerToken/);
  assert.match(middleware, /clearAuthCookies/);
  assert.match(middleware, /domain: "\.opturon\.com"/);
  assert.match(middleware, /partnerLoginRedirect/);
  assert.doesNotMatch(middleware, /globalRole === "partner" \? NextResponse\.redirect\(new URL\("\/", request\.url\)\) : NextResponse\.redirect\(mainAppUrl\("\/app"\)\)/);
}

function testPartnerCallbacksCannotPointToCrm() {
  const loginForm = read("components/login-form.tsx");

  assert.match(loginForm, /PARTNER_CALLBACK_PATHS/);
  assert.match(loginForm, /authIntent !== "partner"/);
  assert.match(loginForm, /pathname === "\/partners"/);
  assert.match(loginForm, /return fallback/);
  assert.doesNotMatch(loginForm, /PARTNER_CALLBACK_PATHS = new Set\(\[[^\]]*"\/app"/s);
}

function testRealRegressionGuadalupeCannotBleedIntoPartnerPortal() {
  const auth = read("lib/auth.ts");
  const access = read("lib/saas/access.ts");

  assert.doesNotMatch(auth, /Guadalupe Villarreal/);
  assert.match(auth, /partnerId/);
  assert.match(auth, /tenantId = undefined/);
  assert.match(access, /Forbidden/);
  assert.match(access, /partnerId: ctx\.session\.user\?\.partnerId/);
}

function run() {
  testPartnerLoginDoesNotUseClientResolver();
  testPartnerSessionIsStrictAndTenantless();
  testPartnerHostRejectsClientCookie();
  testPartnerCallbacksCannotPointToCrm();
  testRealRegressionGuadalupeCannotBleedIntoPartnerPortal();
  console.log("partners-cross-subdomain-auth.test.ts: ok");
}

run();
