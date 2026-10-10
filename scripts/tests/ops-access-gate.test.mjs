import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";

const projectRoot = process.cwd();
const cookieSource = readFileSync(join(projectRoot, "lib/ops/ops-cookie.ts"), "utf8");
const cookieModuleUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(cookieSource, { mode: "transform" })).toString("base64")}`;
const source = readFileSync(join(projectRoot, "lib/ops-access.ts"), "utf8").replaceAll('from "./ops/ops-cookie"', `from "${cookieModuleUrl}"`);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: "transform" })).toString("base64")}`;
const opsAccess = await import(moduleUrl);
const opsCookie = await import(cookieModuleUrl);
const environmentKeys = ["OPS_PASSWORD", "PORTAL_INTERNAL_KEY", "OPS_ACCESS_SECRET", "NEXTAUTH_SECRET"];
const originalEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
const fixturePassword = "ops-test-only-password";
const fixtureSigningSecret = "ops-test-only-signing-secret";

try {
  for (const key of environmentKeys) delete process.env[key];
  process.env.PORTAL_INTERNAL_KEY = "ops-test-only-internal-key";
  assert.equal(opsAccess.isOpsAccessConfigured(), false, "missing OPS_PASSWORD fails closed even when PORTAL_INTERNAL_KEY exists");
  assert.equal(opsAccess.validateOpsPassword(fixturePassword), false, "a backend internal key is never accepted as the OPS password");
  assert.equal(opsAccess.createOpsAccessToken(), null, "no access token is issued when OPS_PASSWORD is missing");

  process.env.OPS_PASSWORD = fixturePassword;
  process.env.OPS_ACCESS_SECRET = fixtureSigningSecret;
  assert.equal(opsAccess.isOpsAccessConfigured(), true, "OPS is configured with its dedicated password and signing secret");
  assert.equal(opsAccess.validateOpsPassword("incorrect-test-password"), false, "incorrect password is rejected");
  assert.equal(opsAccess.validateOpsPassword(fixturePassword), true, "correct test password is accepted server-side");

  const token = opsAccess.createOpsAccessToken(1_800_000_000_000);
  assert.equal(typeof token, "string", "a valid test password configuration can issue an access token");
  assert.equal(opsAccess.verifyOpsAccessToken(token, 1_800_000_000_001), true, "issued token verifies while valid");
  assert.equal(opsAccess.verifyOpsAccessToken(token, 1_900_000_000_000), false, "expired token is rejected");
  assert.equal(token.includes(fixturePassword), false, "OPS password is not embedded in the access token");

  for (const [path, expectedPath] of [
    [opsCookie.OPS_ACCESS_COOKIE_PATHS.page, "/app/ops"],
    [opsCookie.OPS_ACCESS_COOKIE_PATHS.api, "/api/app/ops"]
  ]) {
    const options = opsCookie.opsAccessCookieOptions(path, true);
    assert.equal(options.path, expectedPath);
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, "lax");
    assert.equal(options.maxAge, 12 * 60 * 60);
    assert.equal("domain" in options, false, "OPS cookie stays host-only");
  }
  assert.equal(opsCookie.opsAccessCookieOptions(opsCookie.OPS_ACCESS_COOKIE_PATHS.api, false).secure, false);
} finally {
  for (const [key, value] of originalEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const gate = readFileSync(join(projectRoot, "components/app/ops/OpsAccessGate.tsx"), "utf8");
const unlockRoute = readFileSync(join(projectRoot, "app/api/app/ops/unlock/route.ts"), "utf8");
const opsPage = readFileSync(join(projectRoot, "app/app/ops/page.tsx"), "utf8");
const appShell = readFileSync(join(projectRoot, "components/layout/app-shell.tsx"), "utf8");
const lockRoute = readFileSync(join(projectRoot, "app/api/app/ops/lock/route.ts"), "utf8");
const middleware = readFileSync(join(projectRoot, "middleware.ts"), "utf8");

assert.match(unlockRoute, /requireAppApi\(\)/, "unlock is protected by the authenticated server route");
assert.match(unlockRoute, /validateOpsPassword\(password\)/, "the expected password is checked server-side");
assert.match(opsPage, /isOpsAccessConfigured\(\)/, "server page checks access configuration without passing the password");
assert.doesNotMatch(gate, /process\.env|expectedPassword|OPS_PASSWORD\s*[:=]/, "client component never receives or reads the expected password");
assert.doesNotMatch(unlockRoute, /console\.(?:log|error|warn)|password\s*:\s*password/, "the unlock route does not log or echo the submitted password");
assert.doesNotMatch(gate, /localStorage|sessionStorage/, "the password is not persisted in browser storage");
assert.match(unlockRoute, /Object\.values\(OPS_ACCESS_COOKIE_PATHS\)/, "unlock issues page- and API-scoped cookies");
assert.match(lockRoute, /Object\.values\(OPS_ACCESS_COOKIE_PATHS\)/, "lock expires both cookie paths");
assert.match(middleware, /OPS_ACCESS_COOKIE_PATHS\.api/, "existing page-scoped OPS sessions are migrated to API scope");
assert.match(middleware, /Math\.min\(remainingSeconds/, "migration never extends the original signed token lifetime");
assert.match(middleware, /isOpsUiPath \? request\.cookies\.get\(OPS_ACCESS_COOKIE\)/, "cookie migration runs only from the OPS UI request");

assert.match(gate, /Centro de Supervisión Comercial/);
assert.match(gate, /OPS COMERCIAL/);
assert.match(gate, /Acceso exclusivo para supervisores y responsables autorizados/);
assert.match(gate, /Leads sin asignar o que requieren atención/);
assert.match(gate, /Seguimientos pendientes, vencidos y completados/);
assert.match(gate, /Actividad y carga de trabajo por vendedor/);
assert.match(gate, /Reasignaciones e historial comercial/);
assert.match(gate, /<form[^>]*onSubmit=/);
assert.match(gate, /htmlFor="ops-password"/);
assert.match(gate, /autoComplete="current-password"/);
assert.match(gate, /type=\{showPassword \? "text" : "password"\}/);
assert.match(gate, /aria-label=\{showPassword \? "Ocultar contraseña" : "Mostrar contraseña"\}/);
assert.match(gate, /onClick=\{\(\) => setShowPassword\(\(visible\) => !visible\)\}/);
assert.match(gate, /unlockInFlight\.current\) return/);
assert.match(gate, /setError\("Contraseña incorrecta\. Verificá los datos e intentá nuevamente\."\)/);
assert.match(gate, /Verificando acceso…/);
assert.match(gate, /grid-cols-1 lg:grid-cols-/);
assert.match(gate, /setUnlocked\(true\)/);
assert.match(gate, /router\.refresh\(\)/);
assert.match(gate, /api\/app\/ops\/unlock/);
assert.match(appShell, /Gestioná conversaciones, ventas y operación comercial/);
assert.doesNotMatch(appShell, /Gestiona conversaciones, automatizaciones y crecimiento/);

console.log("ops-access-gate.test.mjs passed");
