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
  assert.match(read("app/partners/network/page.tsx"), /page="network"/);
  assert.match(read("app/partners/commissions/page.tsx"), /page="commissions"/);
  assert.match(read("app/api/partners/me/commissions/route.ts"), /requirePartnerApi/);
  assert.match(read("app/partners/profile/page.tsx"), /page="profile"/);
  assert.match(read("app/(partners-public)/partners/invite/page.tsx"), /PartnerInvitationAcceptForm/);
}

function testPortalShellIsIndependent() {
  const shellSource = read("components/partners/PartnerPortalShell.tsx");
  const partnersPortalLib = read("lib/partners-portal.ts");
  assert.match(shellSource, /Portal de asesores/);
  assert.match(shellSource, /PARTNER_PORTAL_NAV/);
  assert.match(shellSource, /partnerHrefForHost/);
  assert.match(partnersPortalLib, /label:\s*"Inicio"/);
  assert.match(partnersPortalLib, /label:\s*"Mis clientes"/);
  assert.match(partnersPortalLib, /label:\s*"Mi carrera"/);
  assert.match(partnersPortalLib, /label:\s*"Mi red"/);
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
  assert.match(source, /\/api\/partners\/me\/network/);
  assert.match(source, /\/api\/partners\/me\/commissions/);
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

function testCareerUsesPublishedProgressOnly() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  const partnersPortalLib = read("lib/partners-portal.ts");
  const backendService = read("../src/services/partners.service.js");
  const backendRepo = read("../src/repositories/partners.repository.js");

  assert.match(source, /Mi carrera/);
  assert.match(source, /Progreso principal/);
  assert.match(source, /Entende tu rango actual/);
  assert.match(source, /Requisitos cumplidos/);
  assert.match(source, /Requisitos pendientes/);
  assert.match(source, /Alcanzaste el nivel mas alto de la carrera/);
  assert.match(source, /Sin evaluacion cuantificada visible/);
  assert.match(source, /Respuesta incompleta para progreso detallado/);
  assert.match(source, /Escalera de rangos/);
  assert.match(source, /Actual/);
  assert.match(source, /Siguiente/);
  assert.match(source, /Futuro/);
  assert.match(source, /Tope recurrente/);
  assert.match(source, /Sin pago por reclutar/);
  assert.match(source, /Solo se comisionan pagos reales acreditados y no revertidos/);
  assert.match(source, /careerProgress/);
  assert.match(partnersPortalLib, /PartnerPortalCareerProgress/);
  assert.match(partnersPortalLib, /summarizeCareerRequirementGap/);
  assert.match(partnersPortalLib, /Te faltan/);
  assert.match(partnersPortalLib, /formatCareerRequirementValue/);
  assert.match(backendService, /findLatestRankEvaluationByPartnerId/);
  assert.match(backendService, /progressPercent/);
  assert.match(backendService, /requirements/);
  assert.match(backendRepo, /partner_rank_evaluations/);
  assert.doesNotMatch(source, /partnerId=/i);
  assert.doesNotMatch(source, /Mercado Pago/i);
}

function testClientsUsesRealDataAndPortfolioUx() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  const partnersPortalLib = read("lib/partners-portal.ts");
  const backendRepo = read("../src/repositories/partners.repository.js");

  assert.match(source, /Cartera del asesor/);
  assert.match(source, /Resumen superior/);
  assert.match(source, /Clientes totales/);
  assert.match(source, /Al dia/);
  assert.match(source, /Pendientes o vencidos/);
  assert.match(source, /Buscar por nombre, nota u origen/);
  assert.match(source, /Todos los estados/);
  assert.match(source, /Todos los estados de pago/);
  assert.match(source, /Mas recientes/);
  assert.match(source, /Nombre A-Z/);
  assert.match(source, /No encontramos clientes con esos filtros/);
  assert.match(source, /Panel de detalle/);
  assert.match(source, /Estado de pago/);
  assert.match(source, /Al dia/);
  assert.match(source, /Pendientes o vencidos/);
  assert.match(source, /Sin informacion confiable de pagos publicada para este cliente/);
  assert.match(source, /lg:hidden/);
  assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_320px\]/);
  assert.match(source, /resolvePartnerClientDisplayName/);
  assert.match(source, /summarizeAttributionSource/);
  assert.match(source, /resolvePartnerClientPaymentState/);
  assert.match(partnersPortalLib, /summarizePartnerBillingState/);
  assert.match(partnersPortalLib, /partnerBillingVariant/);
  assert.match(source, /selectedClientId/);
  assert.match(source, /sortKey/);
  assert.match(partnersPortalLib, /resolvePartnerClientDisplayName/);
  assert.match(partnersPortalLib, /summarizeAttributionSource/);
  assert.match(backendRepo, /LEFT JOIN LATERAL/);
  assert.match(backendRepo, /ss\."externalTenantId" = pca\."tenantId"/);
  assert.match(backendRepo, /billingNextPaymentAt/);
  assert.match(backendRepo, /pca\."attributionSource"/);
  assert.match(backendRepo, /pca\."attributedAt"/);
  assert.match(backendRepo, /pca\."endedAt"/);
  assert.match(backendRepo, /c\.name AS "clinicName"/);
  assert.doesNotMatch(source, /comision generada/i);
  assert.doesNotMatch(source, /deuda/i);
  assert.doesNotMatch(source, /mercadoPagoPreapprovalId/);
}

function testNetworkUsesSecureHierarchyView() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  const partnersPortalLib = read("lib/partners-portal.ts");
  const backendService = read("../src/services/partners.service.js");
  const backendRepo = read("../src/repositories/partners.repository.js");

  assert.match(source, /Mi red/);
  assert.match(source, /Conoce el crecimiento y la actividad comercial de tu equipo/);
  assert.match(source, /Primera linea/);
  assert.match(source, /Segunda linea/);
  assert.match(source, /Tercera linea/);
  assert.match(source, /Red activa total/);
  assert.match(source, /Actividad del nivel seleccionado/);
  assert.match(source, /Todavia no tenes asesores en tu red/);
  assert.match(source, /Datos incompletos visibles para este asesor/);
  assert.match(source, /lg:hidden/);
  assert.match(source, /resolvePartnerNetworkDisplayName/);
  assert.match(partnersPortalLib, /PartnerPortalNetwork/);
  assert.match(partnersPortalLib, /summarizeNetworkDepth/);
  assert.match(backendService, /getPartnerNetwork/);
  assert.match(backendService, /listPartnerNetworkNodes/);
  assert.match(backendRepo, /WITH RECURSIVE partner_network/);
  assert.match(backendRepo, /network\.depth < \$2/);
}

function testCommissionsUseRegisteredLedgerSemantics() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  const partnersPortalLib = read("lib/partners-portal.ts");
  const backendService = read("../src/services/partners.service.js");
  const backendRepo = read("../src/repositories/partners.repository.js");
  const migration = read("../db/migrations/051_partners_foundation_phase1.sql");

  assert.match(source, /Comisiones registradas/);
  assert.match(source, /Movimientos del asesor/);
  assert.match(source, /Semantica contable visible/);
  assert.match(source, /Comisiones generadas/);
  assert.match(source, /Reversiones/);
  assert.match(source, /Neto registrado/);
  assert.match(source, /Todos los estados/);
  assert.match(source, /Todos los tipos reales/);
  assert.match(source, /Movimientos registrados/);
  assert.match(source, /No encontramos movimientos con esos filtros/);
  assert.match(source, /Todavia no tenes movimientos registrados/);
  assert.match(source, /Reversion visible para mantener la trazabilidad/);
  assert.match(source, /Solo se registran pagos reales, acreditados y no revertidos/);
  assert.match(source, /No se usa 'Pagado', 'Cobrado' ni 'Disponible para retirar'/);
  assert.match(partnersPortalLib, /PartnerPortalCommissionLedger/);
  assert.match(partnersPortalLib, /summarizePartnerCommissionType/);
  assert.match(partnersPortalLib, /summarizePartnerCommissionStatus/);
  assert.match(backendService, /getPartnerCommissionLedger/);
  assert.match(backendService, /invalid_partner_commission_query/);
  assert.match(backendRepo, /listPartnerCommissionLedger/);
  assert.match(backendRepo, /COALESCE\(SUM\(CASE WHEN pce\.status = 'generated'/);
  assert.match(backendRepo, /ABS\(pce\."commissionAmount"\)/);
  assert.match(backendRepo, /partner_client_attributions pca/);
  assert.match(migration, /partner_commission_entries_status_check CHECK \(status IN \('simulated', 'generated', 'reversed'\)\)/);
  assert.match(migration, /partner_commission_entries_payment_status_check CHECK \("paymentStatus" IN \('accredited'\)\)/);
}

function testProfileUsesSafeIdentityView() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  const partnersPortalLib = read("lib/partners-portal.ts");
  const backendRepo = read("../src/repositories/partners.repository.js");

  assert.match(source, /Consulta tu identidad y estado dentro de Opturon/);
  assert.match(source, /Cuenta protegida/);
  assert.match(source, /Informacion personal/);
  assert.match(source, /Informacion comercial/);
  assert.match(source, /Codigo de asesor/);
  assert.match(source, /Fecha de ingreso/);
  assert.match(source, /Ultimo acceso/);
  assert.match(source, /Cerrar sesion/);
  assert.match(source, /No informado/);
  assert.match(source, /Sin edicion sensible/);
  assert.match(source, /Datos protegidos/);
  assert.match(source, /partnerInitials/);
  assert.match(source, /profileFallback/);
  assert.match(partnersPortalLib, /export function partnerInitials/);
  assert.match(partnersPortalLib, /export function profileFallback/);
  assert.match(backendRepo, /pp\.code/);
  assert.match(backendRepo, /pp\.phone/);
  assert.match(backendRepo, /rel\."sponsorPartnerId"/);
  assert.match(backendRepo, /pa\."lastLoginAt"/);
  assert.doesNotMatch(source, /passwordHash/);
  assert.doesNotMatch(source, /actorUserId/);
  assert.doesNotMatch(source, /PORTAL_INTERNAL_KEY/);
}

function testPartnerLoginBrandingIsDedicated() {
  const loginPage = read("app/(auth)/login/page.tsx");
  const loginScreen = read("components/auth/LoginScreen.tsx");
  const loginForm = read("components/login-form.tsx");

  assert.match(loginPage, /LoginScreen/);
  assert.match(loginScreen, /Portal de asesores/);
  assert.match(loginScreen, /partnerLoginCallbackForHost/);
  assert.match(loginForm, /defaultCallbackUrl/);
  assert.match(loginForm, /safeCallbackUrl/);
}

function testPartnerCustomDomainRoutingIsCentralized() {
  const middleware = read("middleware.ts");
  const partnersPortalLib = read("lib/partners-portal.ts");
  const inviteForm = read("components/partners/PartnerInvitationAcceptForm.tsx");
  const backendInvitationEmail = read("../src/services/partner-invitations-email.service.js");

  assert.match(partnersPortalLib, /PARTNER_PORTAL_HOST = "partners\.opturon\.com"/);
  assert.match(partnersPortalLib, /partnerInternalPathForHostPath/);
  assert.match(partnersPortalLib, /partnerPublicPathForInternalPath/);
  assert.match(partnersPortalLib, /legacyHref: "\/partners\/clients"/);
  assert.match(partnersPortalLib, /path: "\/clients"/);
  assert.match(middleware, /isPartnerHost && path\.startsWith\("\/partners"\)/);
  assert.match(middleware, /partnerInternalPathForHostPath\(path\)/);
  assert.match(middleware, /isPartnerPublicPath\(path\)/);
  assert.match(middleware, /"\/clients"/);
  assert.match(inviteForm, /partnerLoginCallbackForHost/);
  assert.match(backendInvitationEmail, /https:\/\/partners\.opturon\.com/);
  assert.match(backendInvitationEmail, /invitationPath/);
  assert.match(backendInvitationEmail, /encodeURIComponent\(token\)/);
}

function run() {
  testPortalRoutesExist();
  testPortalShellIsIndependent();
  testPortalWorkspaceUsesSecureEndpointsOnly();
  testHomeUsesRealDataAndStates();
  testCareerUsesPublishedProgressOnly();
  testClientsUsesRealDataAndPortfolioUx();
  testNetworkUsesSecureHierarchyView();
  testCommissionsUseRegisteredLedgerSemantics();
  testProfileUsesSafeIdentityView();
  testPartnerLoginBrandingIsDedicated();
  testPartnerCustomDomainRoutingIsCentralized();
  console.log("partners-portal-ui.test.ts: ok");
}

run();
