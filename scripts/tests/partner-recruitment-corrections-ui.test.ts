import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

function testPartnerCorrectionUi() {
  const panel = read("components/partners/PartnerRecruitmentPanel.tsx");
  const reopenRoute = read("app/api/partners/me/recruitment-applications/[applicationId]/reopen-for-edit/route.ts");

  assert.match(panel, /Corregir datos/);
  assert.match(panel, /volvera a revision de Administracion/);
  assert.match(panel, /Pendiente de envio de invitacion/);
  assert.match(reopenRoute, /reopen-for-edit/);
  assert.match(reopenRoute, /requirePartnerApi/);
}

function testAdminCorrectionUi() {
  const adminPanel = read("components/app/PartnerRecruitmentAdminPanel.tsx");
  const adminProxy = read("lib/partners-admin-proxy.ts");

  assert.match(adminPanel, /Aprobadas pendientes de invitacion/);
  assert.match(adminPanel, /Solicitar correccion/);
  assert.match(adminPanel, /recruitment_duplicate_phone/);
  assert.match(adminPanel, /No se pudo enviar la invitacion porque el telefono coincide con una cuenta existente/);
  assert.match(adminProxy, /request-changes/);
  assert.match(adminProxy, /send-invitation/);
}

function run() {
  testPartnerCorrectionUi();
  testAdminCorrectionUi();
  console.log("partner-recruitment-corrections-ui.test.ts: ok");
}

run();
