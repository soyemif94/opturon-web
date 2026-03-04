import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  AuditLog,
  BusinessSettings,
  CatalogCategory,
  CatalogProduct,
  CommandAction,
  Contact,
  Conversation,
  Deal,
  Faq,
  IndustryTemplate,
  Message,
  Membership,
  SaasData,
  Tenant,
  TenantMetrics,
  TenantNote,
  TenantTask,
  Template,
  User
} from "@/lib/saas/types";

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "saas.json");

const DEFAULT_TEMPLATES: IndustryTemplate[] = [
  {
    id: "tpl-telefonia",
    industry: "telefonia / accesorios",
    defaultFAQs: [
      { question: "Tienen garantía?", answer: "Sí, todos nuestros productos tienen garantía oficial." },
      { question: "Hacen envíos?", answer: "Sí, enviamos en el día en zonas seleccionadas." }
    ],
    defaultCategories: ["Fundas", "Cargadores", "Auriculares"],
    defaultProducts: [
      { name: "Funda Silicona", category: "Fundas", price: 10000, stockQty: 35, active: true },
      { name: "Cargador Fast 20W", category: "Cargadores", price: 22000, stockQty: 18, active: true }
    ]
  },
  {
    id: "tpl-gastronomia",
    industry: "gastronomía",
    defaultFAQs: [
      { question: "Tienen delivery?", answer: "Sí, contamos con delivery propio y por apps." },
      { question: "Aceptan tarjeta?", answer: "Sí, aceptamos débito, crédito y transferencia." }
    ],
    defaultCategories: ["Entradas", "Platos", "Postres"],
    defaultProducts: [
      { name: "Milanesa Napolitana", category: "Platos", price: 14500, stockQty: 999, active: true },
      { name: "Empanada Carne", category: "Entradas", price: 2200, stockQty: 999, active: true }
    ]
  },
  {
    id: "tpl-clinica",
    industry: "clínica médica",
    defaultFAQs: [
      { question: "Atienden por obra social?", answer: "Sí, trabajamos con obras sociales seleccionadas." },
      { question: "Cómo saco turno?", answer: "Podés reservar turno por WhatsApp o desde el portal." }
    ],
    defaultCategories: ["Consultas", "Estudios", "Controles"],
    defaultProducts: []
  },
  {
    id: "tpl-estetica",
    industry: "estética",
    defaultFAQs: [
      { question: "Qué tratamientos ofrecen?", answer: "Depilación definitiva, limpiezas faciales y más." },
      { question: "Cuánto dura cada sesión?", answer: "Depende del tratamiento; entre 30 y 90 minutos." }
    ],
    defaultCategories: ["Facial", "Corporal", "Promo"],
    defaultProducts: []
  },
  {
    id: "tpl-ferreteria",
    industry: "ferretería",
    defaultFAQs: [
      { question: "Tienen stock inmediato?", answer: "Sí, te confirmamos stock en tiempo real." },
      { question: "Hacen envíos?", answer: "Sí, enviamos en la ciudad y alrededores." }
    ],
    defaultCategories: ["Herramientas", "Tornillería", "Eléctrico"],
    defaultProducts: []
  },
  {
    id: "tpl-inmobiliaria",
    industry: "inmobiliaria",
    defaultFAQs: [
      { question: "Cómo coordino visita?", answer: "Te coordinamos por WhatsApp según disponibilidad." },
      { question: "Qué documentación necesito?", answer: "Te enviamos checklist según operación." }
    ],
    defaultCategories: ["Alquiler", "Venta", "Tasaciones"],
    defaultProducts: []
  },
  {
    id: "tpl-educacion",
    industry: "educación",
    defaultFAQs: [
      { question: "Cómo me inscribo?", answer: "Completá el formulario y te contactamos por WhatsApp." },
      { question: "Entregan certificados?", answer: "Sí, emitimos certificados al finalizar." }
    ],
    defaultCategories: ["Cursos", "Workshops", "Programas"],
    defaultProducts: []
  },
  {
    id: "tpl-servicios-tecnicos",
    industry: "servicios técnicos",
    defaultFAQs: [
      { question: "Hacen presupuesto?", answer: "Sí, realizamos diagnóstico y presupuesto sin cargo." },
      { question: "En cuánto tiempo responden?", answer: "Respondemos en el día hábil." }
    ],
    defaultCategories: ["Mantenimiento", "Reparación", "Urgencias"],
    defaultProducts: []
  }
];

function emptyData(): SaasData {
  const defaultCommandActions: CommandAction[] = [
    { id: "act-request-budget", label: "Pedir presupuesto", tags: ["precio", "presupuesto", "costo"] },
    { id: "act-request-address", label: "Pedir direccion", tags: ["envio", "direccion", "zona"] },
    { id: "act-request-email", label: "Pedir email", tags: ["email", "correo", "contacto"] }
  ];
  const defaultTemplates: Template[] = [];

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
    templates: defaultTemplates,
    commandActions: defaultCommandActions,
    catalogCategories: [],
    faqs: [],
    businessSettings: [],
    auditLog: [],
    industryTemplates: DEFAULT_TEMPLATES,
    tenantMetrics: []
  };
}

function ensureDataFile() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(emptyData(), null, 2), "utf8");
  }
}

export function readSaasData(): SaasData {
  ensureDataFile();
  const raw = readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<SaasData>;
  const base = emptyData();
  return {
    ...base,
    ...parsed,
    contacts: parsed.contacts || [],
    conversations: parsed.conversations || [],
    messages: parsed.messages || [],
    deals: parsed.deals || [],
    templates: parsed.templates || base.templates,
    commandActions: parsed.commandActions || base.commandActions,
    industryTemplates: parsed.industryTemplates?.length ? parsed.industryTemplates : base.industryTemplates
  };
}

export function writeSaasData(data: SaasData): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function newId(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rnd}`;
}

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return readSaasData().users.find((u) => u.email.toLowerCase() === normalized);
}

export function findMembership(userId: string, tenantId?: string): Membership | undefined {
  const data = readSaasData();
  if (tenantId) return data.memberships.find((m) => m.userId === userId && m.tenantId === tenantId);
  return data.memberships.find((m) => m.userId === userId);
}

export function listTenantMembers(tenantId: string): Array<User & { tenantRole: Membership["role"] }> {
  const data = readSaasData();
  const memberships = data.memberships.filter((m) => m.tenantId === tenantId);
  return memberships
    .map((membership) => {
      const user = data.users.find((u) => u.id === membership.userId);
      if (!user) return null;
      return { ...user, tenantRole: membership.role };
    })
    .filter(Boolean) as Array<User & { tenantRole: Membership["role"] }>;
}

export function appendAuditLog(entry: Omit<AuditLog, "id" | "createdAt"> & Partial<Pick<AuditLog, "id" | "createdAt">>) {
  const data = readSaasData();
  data.auditLog.unshift({
    id: entry.id || newId("audit"),
    createdAt: entry.createdAt || new Date().toISOString(),
    ...entry
  });
  writeSaasData(data);
}

export function ensureBusinessSettings(tenantId: string): BusinessSettings {
  const data = readSaasData();
  let settings = data.businessSettings.find((item) => item.tenantId === tenantId);
  if (!settings) {
    settings = { id: newId("biz"), tenantId };
    data.businessSettings.push(settings);
    writeSaasData(data);
  }
  return settings;
}

export function ensureTenantMetrics(tenantId: string): TenantMetrics {
  const data = readSaasData();
  let metrics = data.tenantMetrics.find((item) => item.tenantId === tenantId);
  if (!metrics) {
    metrics = { tenantId, messages7d: 0, webhookErrors7d: 0, activeConversations: 0 };
    data.tenantMetrics.push(metrics);
    writeSaasData(data);
  }
  return metrics;
}

export function applyIndustryTemplate(tenantId: string, industry: string): void {
  const data = readSaasData();
  const template = data.industryTemplates.find((item) => item.industry.toLowerCase() === industry.toLowerCase());
  if (!template) return;

  const now = new Date().toISOString();

  const missingCategories = template.defaultCategories.filter(
    (name) => !data.catalogCategories.some((cat) => cat.tenantId === tenantId && cat.name.toLowerCase() === name.toLowerCase())
  );

  const newCategories: CatalogCategory[] = missingCategories.map((name) => ({
    id: newId("cat"),
    tenantId,
    name
  }));

  const newFaqs: Faq[] = template.defaultFAQs.map((faq) => ({
    id: newId("faq"),
    tenantId,
    question: faq.question,
    answer: faq.answer,
    active: true
  }));

  const newProducts: CatalogProduct[] = template.defaultProducts.map((product) => ({
    id: newId("prod"),
    tenantId,
    name: product.name,
    category: product.category,
    sku: product.sku,
    price: product.price,
    promoPrice: product.promoPrice,
    stockQty: product.stockQty,
    description: product.description,
    active: product.active,
    createdAt: now,
    updatedAt: now
  }));

  data.catalogCategories.push(...newCategories);
  data.faqs.push(...newFaqs);
  data.catalogProducts.push(...newProducts);
  writeSaasData(data);
}

export function calculateHealthScore(tenantId: string): { score: number; status: "verde" | "amarillo" | "rojo" } {
  const data = readSaasData();
  const metrics = data.tenantMetrics.find((item) => item.tenantId === tenantId) || {
    tenantId,
    messages7d: 0,
    webhookErrors7d: 0,
    activeConversations: 0,
    lastActivityAt: undefined
  };

  let score = 100;
  score -= Math.max(0, 10 - Math.min(metrics.messages7d, 10)) * 3;
  score -= Math.min(metrics.webhookErrors7d, 10) * 6;
  score += Math.min(metrics.activeConversations, 10) * 2;

  if (metrics.lastActivityAt) {
    const ageDays = Math.floor((Date.now() - new Date(metrics.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
    score -= Math.min(ageDays, 30);
  } else {
    score -= 20;
  }

  const bounded = Math.max(0, Math.min(100, score));
  const status = bounded >= 70 ? "verde" : bounded >= 40 ? "amarillo" : "rojo";
  return { score: bounded, status };
}

export function daysActive(tenant: Tenant): number {
  const start = tenant.startAt || tenant.createdAt;
  return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
}

export function touchTenantActivity(tenantId: string): void {
  const data = readSaasData();
  let metrics = data.tenantMetrics.find((item) => item.tenantId === tenantId);
  if (!metrics) {
    metrics = { tenantId, messages7d: 0, webhookErrors7d: 0, activeConversations: 0 };
    data.tenantMetrics.push(metrics);
  }
  metrics.lastActivityAt = new Date().toISOString();
  writeSaasData(data);
}

export function listInboxConversations(tenantId: string): Array<
  Conversation & {
    contact?: Contact;
    unreadCount: number;
    slaMinutes: number;
    deal?: Deal;
  }
> {
  const data = readSaasData();
  const now = Date.now();

  return data.conversations
    .filter((conversation) => conversation.tenantId === tenantId)
    .map((conversation) => {
      const contact = data.contacts.find((item) => item.id === conversation.contactId && item.tenantId === tenantId);
      const deal = data.deals.find((item) => item.contactId === conversation.contactId && item.tenantId === tenantId);
      const messages = data.messages
        .filter((message) => message.conversationId === conversation.id && message.tenantId === tenantId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const unreadCount = messages.filter((message) => message.direction === "inbound" && message.status !== "read").length;
      const lastInbound = messages.find((message) => message.direction === "inbound");
      const baseTime = lastInbound ? new Date(lastInbound.timestamp).getTime() : new Date(conversation.lastMessageAt).getTime();
      const slaMinutes = Math.max(0, Math.floor((now - baseTime) / (1000 * 60)));
      return { ...conversation, contact, unreadCount, slaMinutes, deal };
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export function getInboxConversationDetail(tenantId: string, conversationId: string) {
  const data = readSaasData();
  const conversation = data.conversations.find((item) => item.id === conversationId && item.tenantId === tenantId);
  if (!conversation) return null;

  const contact = data.contacts.find((item) => item.id === conversation.contactId && item.tenantId === tenantId);
  const deal = data.deals.find((item) => item.contactId === conversation.contactId && item.tenantId === tenantId);
  const messages = data.messages
    .filter((item) => item.conversationId === conversation.id && item.tenantId === tenantId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const notes = data.tenantNotes
    .filter((item) => item.tenantId === tenantId && (item.conversationId === conversation.id || item.contactId === conversation.contactId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const tasks = data.tenantTasks
    .filter((item) => item.tenantId === tenantId && (item.conversationId === conversation.id || item.contactId === conversation.contactId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const assignee = conversation.assignedTo ? data.users.find((item) => item.id === conversation.assignedTo) : undefined;

  return { conversation, contact, deal, messages, notes, tasks, assignee };
}

export function inboxQuickReplies() {
  return [
    { intent: "saludo", text: "¡Hola! Gracias por escribirnos. Enseguida te ayudamos." },
    { intent: "precio", text: "Te paso precio y disponibilidad actualizada en este momento." },
    { intent: "envio", text: "Sí, hacemos envíos. ¿En qué zona estás para cotizar?" },
    { intent: "horario", text: "Nuestro horario de atención es de lunes a viernes de 9 a 18 hs." }
  ];
}

export function inboxAiEvents(tenantId: string, conversationId: string) {
  const events = readSaasData().auditLog
    .filter((item) => item.tenantId === tenantId && item.entity === "inbox_ai_event" && item.entityId === conversationId)
    .slice(0, 30)
    .map((item) => ({ id: item.id, text: String(item.metadata?.text || item.action), createdAt: item.createdAt }));
  return events;
}

