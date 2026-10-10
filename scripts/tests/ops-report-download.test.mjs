import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";

const root = process.cwd();
const helperSource = readFileSync(join(root, "lib/ops/report-download.ts"), "utf8");
const helperUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(helperSource, { mode: "transform" })).toString("base64")}`;
const { OPS_REPORT_TYPES, OpsCsvDownloadError, buildOpsReportUrl, parseOpsCsvDownloadResponse } = await import(helperUrl);

assert.deepEqual(OPS_REPORT_TYPES, ["sales", "sellers", "followups", "inventory", "movements", "expirations"]);
assert.equal(
  buildOpsReportUrl("sales", { dateFrom: "2026-10-01", dateTo: "2026-10-09", sellerId: "seller 1", channel: "whatsapp", operationalState: "cold", customer: "  Ana  " }),
  "/api/app/ops/reports/sales?dateFrom=2026-10-01&dateTo=2026-10-09&sellerId=seller+1&channel=whatsapp&customer=Ana"
);
assert.equal(
  buildOpsReportUrl("expirations", { operationalState: "recovery", supplier: "Proveedor", warehouse: "Centro" }),
  "/api/app/ops/reports/expirations?operationalState=recovery&supplier=Proveedor&warehouse=Centro"
);

const csvResponse = new Response("\uFEFFproducto\r\n\"Café\"\r\n", {
  status: 200,
  headers: {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": 'attachment; filename="opturon-ventas-2026-10.csv"'
  }
});
const download = await parseOpsCsvDownloadResponse(csvResponse);
assert.equal(download.filename, "opturon-ventas-2026-10.csv");
assert.match(await download.blob.text(), /Café/);

await assert.rejects(
  parseOpsCsvDownloadResponse(new Response('{"error":"ops_access_required"}', { status: 403, headers: { "content-type": "application/json" } })),
  (error) => error instanceof OpsCsvDownloadError && error.code === "http_error" && error.status === 403
);
await assert.rejects(
  parseOpsCsvDownloadResponse(new Response('{"error":"internal detail"}', { status: 502, headers: { "content-type": "application/json" } })),
  (error) => error instanceof OpsCsvDownloadError && error.status === 502 && !error.message.includes("internal detail")
);
await assert.rejects(
  parseOpsCsvDownloadResponse(new Response("oops", { status: 200, headers: { "content-type": "text/plain" } })),
  (error) => error instanceof OpsCsvDownloadError && error.code === "invalid_content_type"
);
await assert.rejects(
  parseOpsCsvDownloadResponse(new Response("csv", { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } })),
  (error) => error instanceof OpsCsvDownloadError && error.code === "invalid_content_disposition"
);
await assert.rejects(
  parseOpsCsvDownloadResponse(new Response("csv", { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="../../secrets.csv"' } })),
  (error) => error instanceof OpsCsvDownloadError && error.code === "invalid_filename"
);

const dashboard = readFileSync(join(root, "components/app/ops/OpsDashboard.tsx"), "utf8");
const reportRoute = readFileSync(join(root, "app/api/app/ops/reports/[report]/route.ts"), "utf8");
assert.match(dashboard, /credentials:\s*"same-origin"/);
assert.match(dashboard, /async function downloadReport\(\)/);
assert.match(dashboard, /Reintentar descarga/);
assert.match(dashboard, /No pudimos generar el informe\. Intentá nuevamente\./);
assert.doesNotMatch(dashboard, /<a\s+href=\{report\.href\}/, "report download no longer navigates the page to a JSON error body");
assert.doesNotMatch(dashboard, /<a\s+href=\{reportHref\}/);
assert.match(reportRoute, /\["sales", "sellers", "followups", "inventory", "movements", "expirations"\]/);
assert.match(reportRoute, /hasOpsAccessCookie\(cookieStore\).*?status:\s*403/s, "direct report requests remain blocked until OPS is unlocked");
assert.match(reportRoute, /Content-Type": "text\/csv; charset=utf-8"/);
assert.match(reportRoute, /Content-Disposition": `attachment; filename=/);
assert.match(reportRoute, /new NextResponse\(`\\uFEFF\$\{csv\}`/);
assert.doesNotMatch(reportRoute, /cookies\(\).*?(?:delete|OPS_ACCESS_COOKIE_PATHS[\s\S]*?maxAge:\s*0)/, "report downloads do not clear the OPS session");

console.log("ops-report-download.test.mjs passed");
