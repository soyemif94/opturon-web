const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("public plan selection opens the two-path acquisition auth experience", () => {
  const auth = read("components/auth/LoginScreen.tsx");
  const login = read("components/login-form.tsx");
  const register = read("components/auth/RegisterForm.tsx");
  const checkout = read("app/checkout/start/page.tsx");

  assert.match(checkout, /login\?callbackUrl=/);
  assert.match(auth, /callbackUrl\?\.split\("\?"\)/);
  assert.match(auth, /api\/public\/plans/);
  assert.match(auth, /Estás eligiendo/);
  assert.match(auth, /Ya tengo cuenta/);
  assert.match(register, /Crear mi cuenta/);
  assert.match(auth, /RegisterForm embedded/);
  assert.match(login, /normalizeSafeInternalCallback/);
  assert.match(login, /callbackUrl/);
  assert.match(register, /safeCheckoutCallback/);
  assert.match(register, /signIn\("credentials"/);
  assert.match(register, /JSON\.stringify\(\{ name, businessName, email, password \}\)/);
  assert.doesNotMatch(register, /JSON\.stringify\([^)]*planKey/);
});

test("login and registration password visibility controls preserve the existing value", () => {
  const login = read("components/login-form.tsx");
  const register = read("components/auth/RegisterForm.tsx");
  assert.match(login, /showPassword/);
  assert.match(login, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(login, /Mostrar contraseña/);
  assert.match(login, /setShowPassword\(\(visible\) => !visible\)/);
  assert.match(register, /showPassword/);
  assert.match(register, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(register, /Mostrar contraseña/);
  assert.match(register, /setShowPassword\(\(visible\) => !visible\)/);
  assert.doesNotMatch(login, /setPassword\([^)]*showPassword/);
  assert.doesNotMatch(register, /setPassword\([^)]*showPassword/);
});

test("advisor recruitment section is public, connected to partner entry, and avoids guarantees", () => {
  const section = read("components/sections/AdvisorRecruitmentSection.tsx");
  const home = read("components/sections/SaasHome.tsx");
  const footer = read("components/footer.tsx");
  assert.match(home, /AdvisorRecruitmentSection/);
  assert.match(section, /¿Querés trabajar con nosotros\?/);
  assert.match(section, /Monotributo/);
  assert.match(section, /Buscar y contactar/);
  assert.match(section, /Comisiones por nuevas altas y continuidad de clientes/);
  assert.match(section, /login\?callbackUrl=%2Fpartners/);
  assert.match(section, /Quiero ser asesor\/a/);
  assert.match(footer, /Trabajá con nosotros/);
  assert.doesNotMatch(section, /ganancias aseguradas|ingresos garantizados/);
  assert.doesNotMatch(section, /\b(?:25|27,5|30|32,5)%/);
});

test("the milestone does not touch the authenticated portal or billing authority", () => {
  const changed = [
    "components/auth/LoginScreen.tsx",
    "components/auth/RegisterForm.tsx",
    "components/login-form.tsx",
    "components/sections/AdvisorRecruitmentSection.tsx",
    "components/sections/SaasHome.tsx",
    "components/footer.tsx",
    "app/(auth)/register/page.tsx"
  ];
  const all = changed.map(read).join("\n");
  assert.doesNotMatch(all, /createPortalSaasCheckout|activatePlan|setTenantPlan/);
  assert.match(read("components/partners/PartnerPortalWorkspace.tsx"), /PartnerRecruitmentPanel/);
});

