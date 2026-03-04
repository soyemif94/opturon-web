import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";

type Data = {
  tenants: any[];
  users: any[];
  memberships: any[];
  contacts: any[];
  conversations: any[];
  messages: any[];
  deals: any[];
  tenantNotes: any[];
  tenantTasks: any[];
  tenantMetrics: any[];
  industryTemplates: any[];
  catalogProducts: any[];
  catalogCategories: any[];
  faqs: any[];
  businessSettings: any[];
  auditLog: any[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "saas.json");

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readData(): Data {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    const empty = {
      tenants: [], users: [], memberships: [], tenantNotes: [], tenantTasks: [],
      contacts: [], conversations: [], messages: [], deals: [],
      catalogProducts: [], catalogCategories: [], faqs: [], businessSettings: [],
      auditLog: [], industryTemplates: [], tenantMetrics: []
    };
    writeFileSync(DATA_FILE, JSON.stringify(empty, null, 2), "utf8");
  }
  return JSON.parse(readFileSync(DATA_FILE, "utf8"));
}

function writeData(data: Data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

const data = readData();
const now = new Date().toISOString();

let tenant = data.tenants.find((t: any) => t.name === "Demo Tenant Opturon");
if (!tenant) {
  tenant = {
    id: id("tenant"),
    name: "Demo Tenant Opturon",
    industry: "telefonia / accesorios",
    status: "trial",
    createdAt: now,
    startAt: now,
    crmName: "HubSpot",
    crmEnabled: true,
    salesTeamSize: 4,
    website: "https://demo.opturon.com",
    city: "Buenos Aires",
    country: "AR"
  };
  data.tenants.push(tenant);
  data.tenantMetrics.push({
    tenantId: tenant.id,
    lastActivityAt: now,
    messages7d: 12,
    webhookErrors7d: 1,
    activeConversations: 5
  });
}

const staffEmail = (process.env.SAAS_STAFF_EMAIL || "staff@opturon.com").toLowerCase();
const staffPassword = process.env.SAAS_STAFF_PASSWORD || "demo1234";
const ownerEmail = (process.env.SAAS_CLIENT_OWNER_EMAIL || "owner@demo-tenant.com").toLowerCase();
const ownerPassword = process.env.SAAS_CLIENT_OWNER_PASSWORD || "demo1234";

let staff = data.users.find((u: any) => u.email.toLowerCase() === staffEmail);
if (!staff) {
  staff = {
    id: id("usr"),
    email: staffEmail,
    name: "Opturon Staff",
    globalRole: "ops_admin",
    passwordHash: bcrypt.hashSync(staffPassword, 10),
    createdAt: now
  };
  data.users.push(staff);
}

let owner = data.users.find((u: any) => u.email.toLowerCase() === ownerEmail);
if (!owner) {
  owner = {
    id: id("usr"),
    email: ownerEmail,
    name: "Cliente Owner",
    globalRole: "client",
    passwordHash: bcrypt.hashSync(ownerPassword, 10),
    createdAt: now
  };
  data.users.push(owner);
}

if (!data.memberships.some((m: any) => m.userId === owner.id && m.tenantId === tenant.id)) {
  data.memberships.push({ id: id("mbr"), userId: owner.id, tenantId: tenant.id, role: "owner", createdAt: now });
}

if (!data.contacts) data.contacts = [];
if (!data.conversations) data.conversations = [];
if (!data.messages) data.messages = [];
if (!data.deals) data.deals = [];
if (!data.tenantNotes) data.tenantNotes = [];
if (!data.tenantTasks) data.tenantTasks = [];

let contact = data.contacts.find((c: any) => c.tenantId === tenant.id && c.phone === "+5492914000001");
if (!contact) {
  contact = {
    id: id("contact"),
    tenantId: tenant.id,
    name: "María Torres",
    phone: "+5492914000001",
    email: "maria@cliente-demo.com",
    industry: tenant.industry,
    tags: ["lead", "whatsapp"]
  };
  data.contacts.push(contact);
}

let conversation = data.conversations.find((c: any) => c.tenantId === tenant.id && c.contactId === contact.id);
if (!conversation) {
  conversation = {
    id: id("conv"),
    tenantId: tenant.id,
    contactId: contact.id,
    status: "open",
    assignedTo: staff.id,
    lastMessageAt: now,
    priority: "hot",
    botEnabled: true
  };
  data.conversations.push(conversation);
}

if (!data.deals.some((d: any) => d.tenantId === tenant.id && d.contactId === contact.id)) {
  data.deals.push({
    id: id("deal"),
    tenantId: tenant.id,
    contactId: contact.id,
    stage: "qualified",
    value: 250000,
    probability: 65
  });
}

if (!data.messages.some((m: any) => m.tenantId === tenant.id && m.conversationId === conversation.id)) {
  data.messages.push(
    {
      id: id("msg"),
      tenantId: tenant.id,
      conversationId: conversation.id,
      direction: "inbound",
      text: "Hola! Quiero info del plan Sales System.",
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      status: "delivered"
    },
    {
      id: id("msg"),
      tenantId: tenant.id,
      conversationId: conversation.id,
      direction: "system",
      text: "🤖 IA clasificó: intención=precio, prioridad=alta",
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      status: "sent"
    },
    {
      id: id("msg"),
      tenantId: tenant.id,
      conversationId: conversation.id,
      direction: "outbound",
      text: "¡Hola María! Te cuento opciones y te comparto demo en vivo.",
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      status: "read"
    }
  );
}

writeData(data);

console.log("[seed:saas] OK");
console.log(`Tenant: ${tenant.name} (${tenant.id})`);
console.log(`Staff: ${staff.email} / ${staffPassword}`);
console.log(`Owner: ${owner.email} / ${ownerPassword}`);

