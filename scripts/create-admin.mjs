#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";

const ALLOWED_ROLES = new Set(["superadmin", "ops_admin", "sales_rep", "support_agent", "client"]);
const DEFAULT_GA_ROLE = "superadmin";
const DEFAULT_TENANT_NAME = process.env.ADMIN_CREATE_TENANT_NAME || "Demo Tenant Opturon";

function parseArgs(argv) {
  const args = {
    email: process.env.ADMIN_EMAIL || "",
    password: process.env.ADMIN_PASSWORD || "",
    globalRole: process.env.ADMIN_GLOBAL_ROLE || DEFAULT_GA_ROLE,
    name: process.env.ADMIN_NAME || "Opturon Admin",
    withTenant: process.env.ADMIN_CREATE_DEMO_TENANT === "true",
    tenantName: DEFAULT_TENANT_NAME,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--withTenant") {
      args.withTenant = true;
      continue;
    }

    if (token === "--withoutTenant") {
      args.withTenant = false;
      continue;
    }

    const next = argv[i + 1];
    if (!next) continue;

    if (token === "--email") {
      args.email = next;
      i += 1;
      continue;
    }
    if (token === "--password") {
      args.password = next;
      i += 1;
      continue;
    }
    if (token === "--globalRole") {
      args.globalRole = next;
      i += 1;
      continue;
    }
    if (token === "--name") {
      args.name = next;
      i += 1;
      continue;
    }
    if (token === "--tenantName") {
      args.tenantName = next;
      i += 1;
      continue;
    }
  }

  return args;
}

function printUsage() {
  console.log("Usage:");
  console.log('  node scripts/create-admin.mjs --email admin@opturon.com --password "StrongPass123!" --globalRole superadmin');
  console.log("");
  console.log("Optional flags:");
  console.log("  --name <displayName>");
  console.log("  --withTenant            Create demo tenant + owner membership for /app access");
  console.log("  --withoutTenant         Skip tenant creation even if env enables it");
  console.log("  --tenantName <name>     Tenant name when --withTenant is used");
}

function fail(message) {
  console.error(`[admin:create] ${message}`);
  process.exit(1);
}

function newId(prefix) {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rnd}`;
}

function emptyData() {
  return {
    tenants: [],
    users: [],
    memberships: [],
    contacts: [],
    conversations: [],
    messages: [],
    deals: [],
    tenantNotes: [],
    tenantTasks: [],
    catalogProducts: [],
    templates: [],
    commandActions: [],
    catalogCategories: [],
    faqs: [],
    businessSettings: [],
    auditLog: [],
    industryTemplates: [],
    tenantMetrics: []
  };
}

function ensureDataFile(dataFile) {
  const dataDir = join(process.cwd(), "data");
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dataFile)) writeFileSync(dataFile, JSON.stringify(emptyData(), null, 2), "utf8");
}

function readData(dataFile) {
  ensureDataFile(dataFile);
  const raw = readFileSync(dataFile, "utf8");
  const parsed = JSON.parse(raw);
  return { ...emptyData(), ...parsed };
}

function writeData(dataFile, data) {
  writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

function ensureMembership(data, userId, tenantId) {
  const existingMembership = data.memberships.find((item) => item.userId === userId && item.tenantId === tenantId);
  if (existingMembership) {
    if (existingMembership.role !== "owner") existingMembership.role = "owner";
    return existingMembership;
  }

  const membership = {
    id: newId("mbr"),
    userId,
    tenantId,
    role: "owner",
    createdAt: new Date().toISOString()
  };
  data.memberships.push(membership);
  return membership;
}

function ensureTenant(data, tenantName) {
  const existing = data.tenants.find((item) => item.name.toLowerCase() === tenantName.toLowerCase());
  if (existing) return { tenant: existing, created: false };

  const now = new Date().toISOString();
  const tenant = {
    id: newId("tenant"),
    name: tenantName,
    industry: "servicios técnicos",
    status: "trial",
    createdAt: now,
    startAt: now,
    crmName: "N/A",
    crmEnabled: false,
    salesTeamSize: 1,
    website: "",
    city: "",
    country: ""
  };
  data.tenants.push(tenant);
  return { tenant, created: true };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const email = String(args.email || "").trim().toLowerCase();
  const password = String(args.password || "");
  const globalRole = String(args.globalRole || DEFAULT_GA_ROLE).trim();
  const name = String(args.name || "Opturon Admin").trim();
  const tenantName = String(args.tenantName || DEFAULT_TENANT_NAME).trim();

  if (!email) fail("Missing --email (or ADMIN_EMAIL env)");
  if (!password) fail("Missing --password (or ADMIN_PASSWORD env)");
  if (!ALLOWED_ROLES.has(globalRole)) {
    fail(`Invalid --globalRole "${globalRole}". Allowed: ${Array.from(ALLOWED_ROLES).join(", ")}`);
  }

  const dataFile = join(process.cwd(), "data", "saas.json");
  const data = readData(dataFile);
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(password, 10);

  let user = data.users.find((item) => String(item.email || "").toLowerCase() === email);
  let userCreated = false;
  if (!user) {
    user = {
      id: newId("usr"),
      email,
      name,
      globalRole,
      passwordHash,
      createdAt: now
    };
    data.users.push(user);
    userCreated = true;
  } else {
    user.email = email;
    if (name) user.name = name;
    user.globalRole = globalRole;
    user.passwordHash = passwordHash;
  }

  let tenantSummary = "not requested";
  if (args.withTenant) {
    const { tenant, created } = ensureTenant(data, tenantName || DEFAULT_TENANT_NAME);
    ensureMembership(data, user.id, tenant.id);
    tenantSummary = `${tenant.name} (${created ? "created" : "reused"})`;
  }

  writeData(dataFile, data);

  console.log(`[admin:create] ${userCreated ? "created" : "updated"} user ${email}`);
  console.log(`[admin:create] role=${globalRole}`);
  console.log(`[admin:create] tenant=${tenantSummary}`);
  console.log("[admin:create] password was reset successfully");
}

main();
