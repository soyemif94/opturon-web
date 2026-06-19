import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(process.cwd());

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testPortalRoutesExist() {
  assert.match(read("app/partners/layout.tsx"), /PartnerPortalShell/);
  assert.match(read("app/partners/page.tsx"), /PartnerPortalWorkspace/);
  assert.match(read("app/partners/clients/page.tsx"), /page="clients"/);
  assert.match(read("app/partners/career/page.tsx"), /page="career"/);
  assert.match(read("app/partners/commissions/page.tsx"), /page="commissions"/);
  assert.match(read("app/partners/profile/page.tsx"), /page="profile"/);
}

function testPortalShellIsIndependent() {
  const shellSource = read("components/partners/PartnerPortalShell.tsx");
  assert.match(shellSource, /Portal de asesores/);
  assert.match(shellSource, /PARTNER_PORTAL_NAV/);
  assert.doesNotMatch(shellSource, /AppShell/);
  assert.doesNotMatch(shellSource, /Inbox/);
}

function testPortalWorkspaceUsesSecureEndpointsOnly() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  assert.match(source, /\/api\/partners\/me/);
  assert.match(source, /\/api\/partners\/me\/summary/);
  assert.match(source, /\/api\/partners\/me\/clients/);
  assert.match(source, /\/api\/partners\/me\/rank-progress/);
  assert.doesNotMatch(source, /PORTAL_INTERNAL_KEY/);
  assert.doesNotMatch(source, /portalActorId/);
  assert.doesNotMatch(source, /x-partner-id/i);
}

function testPartnerLoginBrandingIsDedicated() {
  const loginPage = read("app/(auth)/login/page.tsx");
  const loginScreen = read("components/auth/LoginScreen.tsx");
  const loginForm = read("components/login-form.tsx");

  assert.match(loginPage, /LoginScreen/);
  assert.match(loginScreen, /Portal de asesores/);
  assert.match(loginScreen, /defaultCallbackUrl="\/partners"/);
  assert.match(loginForm, /defaultCallbackUrl/);
}

function run() {
  testPortalRoutesExist();
  testPortalShellIsIndependent();
  testPortalWorkspaceUsesSecureEndpointsOnly();
  testPartnerLoginBrandingIsDedicated();
  console.log("partners-portal-ui.test.ts: ok");
}

run();
