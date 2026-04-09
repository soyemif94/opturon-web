const allowE2E = process.env.ALLOW_E2E === "true";

if (!allowE2E) {
  console.error("Blocked. Set ALLOW_E2E=true to run Playwright.");
  process.exit(1);
}

const testUserEmail = String(process.env.TEST_USER_EMAIL || "").trim();
const testUserPassword = String(process.env.TEST_USER_PASSWORD || "").trim();

if (!testUserEmail || !testUserPassword) {
  console.error("Missing TEST_USER_EMAIL or TEST_USER_PASSWORD.");
  process.exit(1);
}

console.log("Playwright execution is enabled, but no versioned E2E suite is present in this repo.");
console.log("Run your explicit Playwright command from CI or a controlled local shell after loading the env vars.");
