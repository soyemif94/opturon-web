import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APP_BUILD_DIR = join(process.cwd(), ".next", "server", "app");
const INDEX_HTML = join(APP_BUILD_DIR, "index.html");
const GA_COMPONENT_FILE = join(process.cwd(), "components", "analytics", "GoogleAnalytics.tsx");
const GTAG_SRC = "googletagmanager.com/gtag/js?id=";
const GA_INIT_ID = "ga-init";

function walkFiles(dir, out = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

if (!existsSync(APP_BUILD_DIR) || !statSync(APP_BUILD_DIR).isDirectory()) {
  console.error("[verify-ga4-build] ERROR: Missing .next/server/app. Run `npm run build` first.");
  process.exit(1);
}

if (!existsSync(INDEX_HTML)) {
  console.error("[verify-ga4-build] ERROR: Missing .next/server/app/index.html.");
  process.exit(1);
}

const indexHtml = readFileSync(INDEX_HTML, "utf8");
const indexHasGtagSrc = indexHtml.includes(GTAG_SRC);
const indexHasGaInit = indexHtml.includes(GA_INIT_ID);
const indexGtagRefs = (indexHtml.match(/googletagmanager\.com\/gtag\/js\?id=/g) || []).length;
const indexGaInitRefs = (indexHtml.match(/ga-init/g) || []).length;
const gaComponentHasInitId = existsSync(GA_COMPONENT_FILE) && readFileSync(GA_COMPONENT_FILE, "utf8").includes('id="ga-init"');

if (indexHasGtagSrc && indexGtagRefs >= 1 && (indexHasGaInit || gaComponentHasInitId)) {
  console.log("[verify-ga4-build] OK. GA4 loader found and ga-init configured.");
  process.exit(0);
}

const files = walkFiles(APP_BUILD_DIR).filter((file) => file.endsWith(".html") || file.endsWith(".js"));
let foundGtag = false;
let foundGaInit = false;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  if (!foundGtag && content.includes(GTAG_SRC)) foundGtag = true;
  if (!foundGaInit && content.includes(GA_INIT_ID)) foundGaInit = true;
  if (foundGtag && foundGaInit) break;
}

if (!foundGtag || !foundGaInit) {
  console.error("[verify-ga4-build] ERROR: GA4 markers not found in build output.");
  console.error(
    `[verify-ga4-build] indexHasGtagSrc=${indexHasGtagSrc} indexHasGaInit=${indexHasGaInit} ` +
      `indexGtagRefs=${indexGtagRefs} indexGaInitRefs=${indexGaInitRefs} gaComponentHasInitId=${gaComponentHasInitId}`
  );
  process.exit(1);
}

if (indexGtagRefs < 1 || (!indexHasGaInit && !gaComponentHasInitId)) {
  console.error("[verify-ga4-build] ERROR: Missing gtag/js loader or ga-init configuration.");
  process.exit(1);
}

console.log("[verify-ga4-build] OK. GA4 markers found in build output.");
