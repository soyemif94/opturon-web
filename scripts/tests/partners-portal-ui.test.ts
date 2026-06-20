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
  const partnersPortalLib = read("lib/partners-portal.ts");
  assert.match(shellSource, /Portal de asesores/);
  assert.match(shellSource, /PARTNER_PORTAL_NAV/);
  assert.match(partnersPortalLib, /label:\s*"Inicio"/);
  assert.match(partnersPortalLib, /label:\s*"Mis clientes"/);
  assert.match(partnersPortalLib, /label:\s*"Mi carrera"/);
  assert.match(partnersPortalLib, /label:\s*"Comisiones"/);
  assert.match(partnersPortalLib, /label:\s*"Perfil"/);
  assert.match(shellSource, /lg:hidden/);
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

function testHomeUsesRealDataAndStates() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  assert.match(source, /Clientes activos/);
  assert.match(source, /Cartera visible/);
  assert.match(source, /Progreso al proximo rango/);
  assert.match(source, /Clientes recientes/);
  assert.match(source, /Requisitos cumplidos/);
  assert.match(source, /Requisitos pendientes/);
  assert.match(source, /No pudimos cargar esta vista/);
  assert.match(source, /Todavia no tenes clientes visibles/);
  assert.match(source, /Cargando datos reales del portal partner/);
  assert.match(source, /previewState/);
  assert.match(source, /lg:hidden/);
  assert.doesNotMatch(source, /Comision generada/);
}

function testClientsUsesRealDataAndPortfolioUx() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  const partnersPortalLib = read("lib/partners-portal.ts");
  const backendRepo = read("../src/repositories/partners.repository.js");

  assert.match(source, /Cartera del asesor/);
  assert.match(source, /Resumen superior/);
  assert.match(source, /Clientes totales/);
  assert.match(source, /Clientes activos/);
  assert.match(source, /Incorporados recientemente/);
  assert.match(source, /Buscar por nombre, nota u origen/);
  assert.match(source, /Todos los estados/);
  assert.match(source, /Mas recientes/);
  assert.match(source, /Nombre A-Z/);
  assert.match(source, /No encontramos clientes con esos filtros/);
  assert.match(source, /Panel de detalle/);
  assert.match(source, /Todavia no existe informacion de pagos en esta vista/);
  assert.match(source, /lg:hidden/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_320px\]/);
  assert.match(source, /resolvePartnerClientDisplayName/);
  assert.match(source, /summarizeAttributionSource/);
  assert.match(source, /selectedClientId/);
  assert.match(source, /sortKey/);
  assert.match(partnersPortalLib, /resolvePartnerClientDisplayName/);
  assert.match(partnersPortalLib, /summarizeAttributionSource/);
  assert.match(backendRepo, /pca\."attributionSource"/);
  assert.match(backendRepo, /pca\."attributedAt"/);
  assert.match(backendRepo, /pca\."endedAt"/);
  assert.match(backendRepo, /c\.name AS "clinicName"/);
  assert.doesNotMatch(source, /proximo cobro/i);
  assert.doesNotMatch(source, /clientes pagando/i);
  assert.doesNotMatch(source, /deuda/i);
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
  testHomeUsesRealDataAndStates();
  testClientsUsesRealDataAndPortfolioUx();
  testPartnerLoginBrandingIsDedicated();
  console.log("partners-portal-ui.test.ts: ok");
}

run();
