import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PARTNERS_ADMIN_CREATE_ENABLED,
  PARTNERS_ADMIN_ROUTE,
  buildAuditHeadline,
  buildPartnerKpis,
  filterAndSortPartners,
  getPartnerPreviewBundle,
  getPartnerStatusLabel,
  normalizePartnerRank,
  normalizePartnerStatusFilterValue
} from "../../lib/partners-admin-ui";

const projectRoot = join(process.cwd());

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testRouteGuardAndNav() {
  const pageSource = read("app/app/partners/page.tsx");
  const shellSource = read("components/layout/app-shell.tsx");

  assert.match(pageSource, /requireOpturonAdminPage\(PARTNERS_ADMIN_ROUTE\)/);
  assert.match(shellSource, /href: "\/app\/partners"/);
  assert.match(shellSource, /label: "Red de asesores"/);
  assert.match(shellSource, /adminOnly: true/);
}

function testKpisAndFiltering() {
  const preview = getPartnerPreviewBundle();
  const partnerMap = new Map(preview.partners.map((partner) => [partner.id, partner]));
  const kpis = buildPartnerKpis(preview.partners);

  assert.deepEqual(kpis, {
    total: 4,
    active: 2,
    attributedClients: 14,
    withAssignedRank: 3
  });

  const bySearch = filterAndSortPartners(
    preview.partners,
    { search: "lucia", status: "all", rank: "all", sort: "recent" },
    partnerMap
  );
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0]?.profile?.displayName, "Lucia Ferrer");

  const suspended = filterAndSortPartners(
    preview.partners,
    { search: "", status: "suspended", rank: "all", sort: "recent" },
    partnerMap
  );
  assert.equal(suspended.length, 1);
  assert.equal(normalizePartnerStatusFilterValue(suspended[0].status), "suspended");

  const coordinators = filterAndSortPartners(
    preview.partners,
    { search: "", status: "all", rank: "coordinador", sort: "name" },
    partnerMap
  );
  assert.equal(coordinators.length, 1);
  assert.equal(normalizePartnerRank(coordinators[0].currentRankCode), "coordinador");

  const byLastLogin = filterAndSortPartners(
    preview.partners,
    { search: "", status: "all", rank: "all", sort: "last_login" },
    partnerMap
  );
  assert.equal(byLastLogin[0]?.profile?.displayName, "Lucia Ferrer");
}

function testPresentationRules() {
  assert.equal(PARTNERS_ADMIN_ROUTE, "/app/partners");
  assert.equal(PARTNERS_ADMIN_CREATE_ENABLED, true);
  assert.equal(getPartnerStatusLabel("disabled"), "Dado de baja");
  assert.equal(getPartnerStatusLabel("invited"), "Invitacion pendiente");
  assert.equal(getPartnerStatusLabel("invitation_canceled"), "Invitacion cancelada");
  assert.equal(buildAuditHeadline({ id: "a1", action: "partner_status_changed", reason: "suspended" }), "partner status changed · suspended");
}

function testSensitiveHeadersStayOutOfUi() {
  const source = read("components/app/PartnersAdminWorkspace.tsx");
  assert.match(source, /Crear y enviar invitacion/);
  assert.match(source, /Reenviar invitacion/);
  assert.match(source, /Copiar link de invitacion/);
  assert.match(source, /navigator\.clipboard/);
  assert.match(source, /inviteUrl/);
  assert.match(source, /Si el asesor no la recibe/);
  assert.match(source, /Cancelar invitacion/);
  assert.match(source, /Dar de baja asesor/);
  assert.match(source, /estado seguro de invitacion/);
  assert.doesNotMatch(source, /\/partners\/invite\?token=/);
  assert.doesNotMatch(source, /x-portal-key/i);
  assert.doesNotMatch(source, /x-portal-actor-id/i);
  assert.doesNotMatch(source, /PORTAL_INTERNAL_KEY/i);
  assert.match(source, /bg-\[linear-gradient\(180deg,rgba\(19,30,45,0\.96\),rgba\(11,18,30,0\.96\)\)\]/);
  assert.match(source, /bg-\[rgba\(8,15,25,0\.56\)\]/);
  assert.doesNotMatch(source, /bg-white\/95/);
}

function run() {
  testRouteGuardAndNav();
  testKpisAndFiltering();
  testPresentationRules();
  testSensitiveHeadersStayOutOfUi();
  console.log("partners-admin-ui.test.ts: ok");
}

run();
