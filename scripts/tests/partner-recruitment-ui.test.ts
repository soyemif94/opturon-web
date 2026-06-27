import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testPartnerProxyRoutesExist() {
  assert.match(read("app/api/partners/me/recruitment-applications/route.ts"), /requirePartnerApi/);
  assert.match(read("app/api/partners/me/recruitment-applications\/route.ts"), /partner_sponsor_browser_override_forbidden/);
  assert.match(read("app/api/partners/me/recruitment-applications/[applicationId]/route.ts"), /requirePartnerApi/);
  assert.match(read("app/api/partners/me/recruitment-applications/[applicationId]/reopen-for-edit/route.ts"), /reopen-for-edit/);
  assert.match(read("app/api/partners/me/recruitment-applications/[applicationId]/submit/route.ts"), /\/submit/);
  assert.match(read("app/api/partners/me/recruitment-applications/[applicationId]/cancel/route.ts"), /\/cancel/);
  assert.match(read("lib/partner-recruitment-applications-api.ts"), /x-partner-id/);
  assert.match(read("lib/partner-recruitment-applications-api.ts"), /x-portal-key/);
}

function testAdminProxyRoutesExist() {
  const source = read("lib/partners-admin-proxy.ts");
  assert.match(source, /recruitment-applications/);
  assert.match(source, /request-changes/);
  assert.match(source, /send-invitation/);
  assert.match(source, /request_changes/);
}

function testPartnerNetworkUiContainsRecruitmentPanel() {
  const portalWorkspace = read("components/partners/PartnerPortalWorkspace.tsx");
  const recruitmentPanel = read("components/partners/PartnerRecruitmentPanel.tsx");

  assert.match(portalWorkspace, /PartnerRecruitmentPanel/);
  assert.match(recruitmentPanel, /Invitar nuevo asesor/);
  assert.match(recruitmentPanel, /Postulaciones enviadas/);
  assert.match(recruitmentPanel, /Guardar y enviar a revision/);
  assert.match(recruitmentPanel, /Confirmo que conozco a esta persona/);
  assert.match(recruitmentPanel, /partner_sponsor_browser_override_forbidden/);
  assert.match(recruitmentPanel, /Incorporado/);
  assert.match(recruitmentPanel, /Solo lectura/);
  assert.match(recruitmentPanel, /Correccion solicitada/);
  assert.doesNotMatch(recruitmentPanel, /sponsorPartnerId:\s*form/);
}

function testAdminUiContainsRecruitmentInbox() {
  const adminWorkspace = read("components/app/PartnersAdminWorkspace.tsx");
  const adminPanel = read("components/app/PartnerRecruitmentAdminPanel.tsx");

  assert.match(adminWorkspace, /PartnerRecruitmentAdminPanel/);
  assert.match(adminPanel, /Postulaciones de asesores/);
  assert.match(adminPanel, /Aprobar postulacion/);
  assert.match(adminPanel, /Solicitar correccion/);
  assert.match(adminPanel, /Rechazar postulacion/);
  assert.match(adminPanel, /Enviar invitacion/);
  assert.match(adminPanel, /Motivo administrativo/);
  assert.match(adminPanel, /Buscar sponsor, postulante, email, telefono o documento/);
}

function testInvitationAcceptsRecruitmentSource() {
  const inviteForm = read("components/partners/PartnerInvitationAcceptForm.tsx");
  const inviteRoute = read("app/api/partners/invitations/route.ts");
  const api = read("lib/api.ts");

  assert.match(inviteForm, /partner_recruitment_application/);
  assert.match(inviteForm, /Postulacion patrocinada/);
  assert.match(inviteRoute, /acceptPartnerInvitation/);
  assert.match(api, /validatePartnerInvitation/);
  assert.match(api, /acceptPartnerInvitation/);
}

function testNoRecruitmentCommissionLanguageAdded() {
  const recruitmentPanel = read("components/partners/PartnerRecruitmentPanel.tsx");
  const adminPanel = read("components/app/PartnerRecruitmentAdminPanel.tsx");
  assert.doesNotMatch(recruitmentPanel, /ledger/i);
  assert.doesNotMatch(recruitmentPanel, /comision por reclutar/i);
  assert.doesNotMatch(adminPanel, /ledger/i);
}

function run() {
  testPartnerProxyRoutesExist();
  testAdminProxyRoutesExist();
  testPartnerNetworkUiContainsRecruitmentPanel();
  testAdminUiContainsRecruitmentInbox();
  testInvitationAcceptsRecruitmentSource();
  testNoRecruitmentCommissionLanguageAdded();
  console.log("partner-recruitment-ui.test.ts: ok");
}

run();
