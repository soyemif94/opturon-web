import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..", "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

function testPartnerPortalUi() {
  const source = read("components/partners/PartnerPortalWorkspace.tsx");
  assert.match(source, /Registrar nuevo cliente/);
  assert.match(source, /Solicitudes de alta/);
  assert.match(source, /Guardar y enviar a revision/);
  assert.match(source, /Comprobante obligatorio/);
  assert.match(source, /Pendiente de revision/);
  assert.match(source, /Correccion solicitada/);
  assert.match(source, /Solicitud aprobada\. La activacion del cliente sera procesada por Opturon/);
  assert.match(source, /\/api\/partners\/me\/client-requests/);
  assert.match(source, /FormData/);
  assert.match(source, /PartnerPortalSelect<ClientRequestPaymentMethod>/);
  assert.doesNotMatch(source, /<select/);
}

function testNextPartnerRoutes() {
  assert.match(read("app/api/partners/me/client-requests/route.ts"), /requirePartnerApi/);
  assert.match(read("app/api/partners/me/client-requests/route.ts"), /request\.formData\(\)/);
  assert.match(read("app/api/partners/me/client-requests/[requestId]/route.ts"), /PATCH/);
  assert.match(read("app/api/partners/me/client-requests/[requestId]/submit/route.ts"), /\/submit/);
  assert.match(read("app/api/partners/me/client-requests/[requestId]/cancel/route.ts"), /\/cancel/);
  assert.match(read("app/api/partners/me/client-requests/[requestId]/receipt/route.ts"), /fetchClientRequestReceipt/);
  assert.match(read("lib/partner-client-requests-api.ts"), /x-partner-id/);
}

function testAdminUiAndProxy() {
  const source = read("components/app/PartnersAdminWorkspace.tsx");
  assert.match(source, /Solicitudes de clientes/);
  assert.match(source, /Aprobar solicitud/);
  assert.match(source, /Solicitar correccion/);
  assert.match(source, /Rechazar solicitud/);
  assert.match(source, /Ver o descargar comprobante/);
  assert.match(source, /La observacion administrativa es obligatoria/);
  assert.match(source, /Aprobar no crea tenant, comision, rango ni suscripcion/);
  assert.match(read("lib/partners-admin-proxy.ts"), /client-requests/);
  assert.match(read("app/api/app/admin/partners/client-requests/[requestId]/receipt/route.ts"), /requireOpturonAdminApi/);
}

testPartnerPortalUi();
testNextPartnerRoutes();
testAdminUiAndProxy();
console.log("partner-client-requests-ui.test.ts: ok");
