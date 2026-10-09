import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
const appShell = fs.readFileSync(path.join(root, "components/layout/app-shell.tsx"), "utf8");

assert.match(appShell, /className="app-shell-visual-surface/);
assert.match(css, /\.app-shell-visual-surface\s*\{/);
assert.match(css, /radial-gradient\(ellipse 48rem 30rem at 8% 4%, rgba\(14, 165, 233, 0\.13\)/);
assert.match(css, /rgba\(249, 115, 22, 0\.12\)/);
assert.match(css, /border-radius:\s*50%/);
assert.match(css, /background-attachment:\s*fixed/);
assert.match(css, /pointer-events:\s*none/);
assert.match(css, /\[data-app-theme="light"\] \.app-shell-visual-surface/);
assert.match(css, /@media \(max-width: 767px\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

console.log("app background contract: PASS");
