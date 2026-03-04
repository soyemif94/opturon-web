import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");

const filesToScan = [
  "components/portfolio/WebDesignPortfolio.tsx",
  "app/(public)/portfolio/page.tsx",
  "app/(public)/casos/page.tsx",
  "app/(public)/casos/[slug]/page.tsx"
];

const assetRegex = /(?:src|href|backgroundImage)\s*[:=]\s*["'`](\/[^"'`]+?\.(?:png|jpe?g|webp|gif|svg))["'`]/g;

const expectedAssets = new Set();
const requiredAssets = ["/portfolio/web-mockups-grid.svg"];

for (const relativeFile of filesToScan) {
  const fullPath = path.join(projectRoot, relativeFile);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, "utf8");
  for (const match of content.matchAll(assetRegex)) {
    if (match[1]) {
      expectedAssets.add(match[1]);
    }
  }
}

for (const assetPath of requiredAssets) {
  expectedAssets.add(assetPath);
}

const missingAssets = [];
for (const assetPath of expectedAssets) {
  const fullPath = path.join(publicDir, assetPath.slice(1));
  if (!fs.existsSync(fullPath)) {
    missingAssets.push(assetPath);
  }
}

if (missingAssets.length > 0) {
  console.error("[verify-public-assets] Missing files:");
  for (const asset of missingAssets) {
    console.error(`- ${asset}`);
  }
  process.exit(1);
}

console.log(`[verify-public-assets] OK. Checked ${expectedAssets.size} asset path(s).`);
