import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { statSync } from "node:fs";
import type {
  AuditLog,
  AgendaItem,
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
import { resolveRuntimeDataDir, resolveSaasDataFile } from "@/lib/runtime-data";
import { normalizeText } from "@/lib/search/normalize";

const DATA_DIR = resolveRuntimeDataDir();
const DATA_FILE = resolveSaasDataFile();
let memoryStore: SaasData | null = null;
let memoryStoreVersion: number | null = null;
let warnedAboutMemoryStore = false;

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
    agendaItems: [],
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

function warnMemoryStore(reason: unknown) {
  if (warnedAboutMemoryStore) return;
  warnedAboutMemoryStore = true;
  console.warn("[saas-store] Falling back to in-memory store.", reason);
}

function cloneData(data: SaasData): SaasData {
  return JSON.parse(JSON.stringify(data)) as SaasData;
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function currentStoreVersion() {
  try {
    if (!existsSync(DATA_FILE)) return null;
    return statSync(DATA_FILE).mtimeMs;
  } catch {
    return null;
  }
}

function normalizeData(parsed?: Partial<SaasData> | null): SaasData {
  const base = emptyData();
  if (!parsed) return base;
  return {
    ...base,
    ...parsed,
    tenants: ensureArray(parsed.tenants),
    users: ensureArray(parsed.users),
    memberships: ensureArray(parsed.memberships),
    contacts: ensureArray(parsed.contacts),
    conversations: ensureArray(parsed.conversations),
    messages: ensureArray(parsed.messages),
    agendaItems: ensureArray(parsed.agendaItems),
    deals: ensureArray(parsed.deals),
    tenantNotes: ensureArray(parsed.tenantNotes),
    tenantTasks: ensureArray(parsed.tenantTasks),
    catalogProducts: ensureArray(parsed.catalogProducts),
    templates: ensureArray(parsed.templates).length ? ensureArray(parsed.templates) : base.templates,
    commandActions: ensureArray(parsed.commandActions).length ? ensureArray(parsed.commandActions) : base.commandActions,
    catalogCategories: ensureArray(parsed.catalogCategories),
    faqs: ensureArray(parsed.faqs),
    businessSettings: ensureArray(parsed.businessSettings),
    auditLog: ensureArray(parsed.auditLog),
    industryTemplates: ensureArray(parsed.industryTemplates).length ? ensureArray(parsed.industryTemplates) : base.industryTemplates,
    tenantMetrics: ensureArray(parsed.tenantMetrics)
  };
}

const BOT_HANDOFF_MARKER = "En este punto lo mejor es avanzar con un asesor";
const BAHIA_BLANCA_VARIANTS = ["bahia blanca", "bahía blanca"];

type CommercialHandoffPreference = "demo" | "visit" | "advisor" | null;

function containsBahiaBlanca(text?: string | null) {
  const normalized = normalizeText(String(text || "")).join(" ");
  return BAHIA_BLANCA_VARIANTS.some((variant) => normalized.includes(variant));
}

function detectCommercialHandoffPreference(text?: string | null): CommercialHandoffPreference {
  const normalized = normalizeText(String(text || "")).join(" ");
  if (!normalized) return null;
  if (
    normalized.includes("agendar demo") ||
    normalized.includes("quiero demo") ||
    normalized.includes("quiero una demo") ||
    normalized.includes("demo")
  ) {
    return "demo";
  }

  if (
    normalized.includes("agendar visita") ||
    normalized.includes("visita presencial") ||
    normalized.includes("quiero visita") ||
    normalized.includes("quiero una visita")
  ) {
    return "visit";
  }

  if (normalized.includes("asesor") || normalized.includes("hablar con alguien")) {
    return "advisor";
  }

  return null;
}

function buildCommercialHandoffContent(inboundMessages: Message[]) {
  const contextText = inboundMessages
    .map((message) => String(message.text || ""))
    .join("\n");
  const latestText = inboundMessages[0]?.text || "";
  const visitEligible = containsBahiaBlanca(contextText);
  const preference = detectCommercialHandoffPreference(latestText);

  let note =
    "Handoff comercial pendiente: hablar con asesor o agendar demo. Visita presencial solo disponible en Bahía Blanca.";
  let message =
    "Perfecto 🙌\nEn este punto lo mejor es avanzar con un asesor asi dejamos todo funcionando para tu negocio desde el inicio.\n\nSiguiente paso:\n- Hablar con asesor\n- Agendar demo\n\nSi estas en Bahia Blanca tambien podemos coordinar una visita presencial. Decime tu ciudad y lo vemos.";

  if (visitEligible) {
    note =
      "Handoff comercial pendiente: hablar con asesor, agendar demo o agendar visita presencial en Bahia Blanca.";
    message =
      "Perfecto 🙌\nEn este punto lo mejor es avanzar con un asesor asi dejamos todo funcionando para tu negocio desde el inicio.\n\nSiguiente paso:\n- Hablar con asesor\n- Agendar demo\n- Agendar visita presencial en Bahia Blanca";
  }

  if (preference === "demo") {
    note = visitEligible
      ? "Handoff comercial pendiente: lead con intencion de agendar demo. Mantener opcion de visita presencial en Bahia Blanca."
      : "Handoff comercial pendiente: lead con intencion de agendar demo. Visita presencial solo disponible en Bahia Blanca.";
  } else if (preference === "visit") {
    note = visitEligible
      ? "Handoff comercial pendiente: lead con intencion de agendar visita presencial en Bahia Blanca."
      : "Handoff comercial pendiente: lead con intencion de visita presencial. Validar ciudad; fuera de Bahia Blanca ofrecer demo o asesor.";
  } else if (preference === "advisor") {
    note = visitEligible
      ? "Handoff comercial pendiente: lead pidio hablar con asesor. Disponible demo y visita presencial en Bahia Blanca."
      : "Handoff comercial pendiente: lead pidio hablar con asesor. Disponible demo; visita presencial solo en Bahia Blanca.";
  }

  return { message, note, visitEligible, preference };
}

function isCommercialHandoffTrigger(text?: string | null) {
  const normalized = normalizeText(String(text || "")).join(" ");
  if (!normalized) return false;

  if (normalized === "2" || normalized === "3") return true;

  return [
    "como lo hacemos",
    "quiero avanzar",
    "quiero contratar",
    "conectar whatsapp",
    "agendar demo",
    "quiero demo",
    "quiero una demo",
    "agendar visita",
    "visita presencial",
    "quiero una visita"
  ].some((phrase) => normalized.includes(phrase));
}

function hasExistingBotHandoffMessage(messages: Message[], conversationId: string, tenantId: string) {
  return messages.some(
    (message) =>
      message.tenantId === tenantId &&
      message.conversationId === conversationId &&
      message.direction === "system" &&
      String(message.text || "").includes(BOT_HANDOFF_MARKER)
  );
}

export function readSaasData(): SaasData {
  const version = currentStoreVersion();
  if (memoryStore && memoryStoreVersion === version) return cloneData(memoryStore);

  try {
    if (!existsSync(DATA_FILE)) {
      const data = normalizeData();
      memoryStore = cloneData(data);
      memoryStoreVersion = null;
      return cloneData(data);
    }

    const raw = readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<SaasData>;
    const data = normalizeData(parsed);
    memoryStore = cloneData(data);
    memoryStoreVersion = version;
    return cloneData(data);
  } catch (error) {
    warnMemoryStore(error);
    const data = normalizeData();
    memoryStore = cloneData(data);
    memoryStoreVersion = version;
    return cloneData(data);
  }
}

export function writeSaasData(data: SaasData): void {
  const normalized = normalizeData(data);

  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(normalized, null, 2), "utf8");
    memoryStore = cloneData(normalized);
    memoryStoreVersion = currentStoreVersion();
  } catch (error) {
    throw new Error(
      `[saas-store] Persist failed for ${DATA_FILE}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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

function toAgendaTimeLabel(value?: string | null) {
  if (!value) return null;
  const parts = String(value).split("T")[1];
  return parts ? parts.slice(0, 5) : null;
}

function buildAgendaDateTime(date: string, time?: string | null) {
  const safeDate = String(date || "").trim();
  const safeTime = String(time || "").trim();
  if (!safeDate || !safeTime) return null;
  const iso = new Date(`${safeDate}T${safeTime}:00`);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

type AgendaItemInput = {
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  contactId?: string | null;
  conversationId?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  type: AgendaItem["type"];
  title: string;
  description?: string | null;
  status?: AgendaItem["status"];
  commercialActionType?: AgendaItem["commercialActionType"];
  commercialOutcome?: AgendaItem["commercialOutcome"];
  origin?: string | null;
  location?: string | null;
  resultNote?: string | null;
  nextStepNote?: string | null;
  nextActionAt?: string | null;
  contactNameSnapshot?: string | null;
  phoneSnapshot?: string | null;
};

export function listAgendaItems(tenantId: string, range?: { from?: string | null; to?: string | null }) {
  const from = String(range?.from || "").trim();
  const to = String(range?.to || "").trim();
  return readSaasData().agendaItems
    .filter((item) => item.tenantId === tenantId)
    .filter((item) => (!from || item.date >= from) && (!to || item.date <= to))
    .sort((a, b) => `${a.date}-${toAgendaTimeLabel(a.startAt) || "99:99"}-${a.createdAt || ""}`.localeCompare(`${b.date}-${toAgendaTimeLabel(b.startAt) || "99:99"}-${b.createdAt || ""}`));
}

export function createAgendaItem(tenantId: string, input: AgendaItemInput) {
  const data = readSaasData();
  const now = new Date().toISOString();
  const contact = input.contactId
    ? data.contacts.find((item) => item.id === input.contactId && item.tenantId === tenantId)
    : null;
  const assignedUser =
    input.assignedUserId && tenantId
      ? listTenantMembers(tenantId).find((member) => member.id === input.assignedUserId)
      : null;

  const item: AgendaItem = {
    id: newId("agenda"),
    tenantId,
    date: input.date,
    startAt: buildAgendaDateTime(input.date, input.startTime || null),
    endAt: buildAgendaDateTime(input.date, input.endTime || null),
    contactId: input.contactId || null,
    conversationId: input.conversationId || null,
    assignedUserId: input.assignedUserId || null,
    assignedUserName: input.assignedUserName || assignedUser?.name || null,
    title: input.title,
    description: input.description || null,
    type: input.type,
    status: input.status || "pending",
    commercialActionType: input.commercialActionType || null,
    commercialOutcome: input.commercialOutcome || null,
    origin: input.origin || null,
    location: input.location || null,
    resultNote: input.resultNote || null,
    nextStepNote: input.nextStepNote || null,
    nextActionAt: input.nextActionAt || null,
    contactNameSnapshot: input.contactNameSnapshot || contact?.name || null,
    phoneSnapshot: input.phoneSnapshot || contact?.phone || null,
    createdAt: now,
    updatedAt: now
  };

  data.agendaItems.push(item);
  writeSaasData(data);
  return item;
}

export function updateAgendaItem(
  tenantId: string,
  itemId: string,
  patch: Partial<Omit<AgendaItemInput, "type">> & { type?: AgendaItem["type"]; status?: AgendaItem["status"] }
) {
  const data = readSaasData();
  const item = data.agendaItems.find((entry) => entry.id === itemId && entry.tenantId === tenantId);
  if (!item) return null;

  if (typeof patch.date === "string" && patch.date.trim()) {
    item.date = patch.date.trim();
  }
  if (Object.prototype.hasOwnProperty.call(patch, "startTime")) {
    item.startAt = buildAgendaDateTime(item.date, patch.startTime || null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "endTime")) {
    item.endAt = buildAgendaDateTime(item.date, patch.endTime || null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "contactId")) {
    item.contactId = patch.contactId || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "conversationId")) {
    item.conversationId = patch.conversationId || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "assignedUserId")) {
    item.assignedUserId = patch.assignedUserId || null;
    if (!patch.assignedUserId) {
      item.assignedUserName = null;
    } else if (!Object.prototype.hasOwnProperty.call(patch, "assignedUserName")) {
      item.assignedUserName = listTenantMembers(tenantId).find((member) => member.id === patch.assignedUserId)?.name || null;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "assignedUserName")) {
    item.assignedUserName = patch.assignedUserName || null;
  }
  if (typeof patch.title === "string") item.title = patch.title.trim();
  if (Object.prototype.hasOwnProperty.call(patch, "description")) item.description = patch.description || null;
  if (patch.type) item.type = patch.type;
  if (patch.status) item.status = patch.status;
  if (Object.prototype.hasOwnProperty.call(patch, "commercialActionType")) item.commercialActionType = patch.commercialActionType || null;
  if (Object.prototype.hasOwnProperty.call(patch, "commercialOutcome")) item.commercialOutcome = patch.commercialOutcome || null;
  if (Object.prototype.hasOwnProperty.call(patch, "origin")) item.origin = patch.origin || null;
  if (Object.prototype.hasOwnProperty.call(patch, "location")) item.location = patch.location || null;
  if (Object.prototype.hasOwnProperty.call(patch, "resultNote")) item.resultNote = patch.resultNote || null;
  if (Object.prototype.hasOwnProperty.call(patch, "nextStepNote")) item.nextStepNote = patch.nextStepNote || null;
  if (Object.prototype.hasOwnProperty.call(patch, "nextActionAt")) item.nextActionAt = patch.nextActionAt || null;
  if (Object.prototype.hasOwnProperty.call(patch, "contactNameSnapshot")) item.contactNameSnapshot = patch.contactNameSnapshot || null;
  if (Object.prototype.hasOwnProperty.call(patch, "phoneSnapshot")) item.phoneSnapshot = patch.phoneSnapshot || null;
  item.updatedAt = new Date().toISOString();

  writeSaasData(data);
  return item;
}

export function deleteAgendaItem(tenantId: string, itemId: string) {
  const data = readSaasData();
  const before = data.agendaItems.length;
  data.agendaItems = data.agendaItems.filter((item) => !(item.id === itemId && item.tenantId === tenantId));
  if (data.agendaItems.length === before) return false;
  writeSaasData(data);
  return true;
}

export function getAgendaAvailability(tenantId: string, date: string) {
  const items = listAgendaItems(tenantId, { from: date, to: date });
  const availability = items.filter((item) => item.type === "availability" && item.status !== "cancelled");
  const blocked = items.filter((item) => item.type === "blocked" && item.status !== "cancelled");
  const appointments = items.filter((item) => item.type === "appointment" && item.status !== "cancelled");
  const informational = items.filter((item) => item.type !== "availability" && item.type !== "blocked" && item.type !== "appointment" && item.status !== "cancelled");
  const occupiedWindows = [...blocked, ...appointments]
    .filter((item) => toAgendaTimeLabel(item.startAt) && toAgendaTimeLabel(item.endAt))
    .map((item) => ({
      date: item.date,
      type: item.type,
      title: item.title,
      startTime: toAgendaTimeLabel(item.startAt) || "",
      endTime: toAgendaTimeLabel(item.endAt) || ""
    }));

  return {
    date,
    policy: availability.length > 0 ? ("explicit_availability" as const) : ("implicit_open" as const),
    availability: availability.map((item) => ({
      date: item.date,
      type: item.type,
      title: item.title,
      startTime: toAgendaTimeLabel(item.startAt) || "",
      endTime: toAgendaTimeLabel(item.endAt) || ""
    })),
    blocked: blocked.map((item) => ({
      date: item.date,
      type: item.type,
      title: item.title,
      startTime: toAgendaTimeLabel(item.startAt) || "",
      endTime: toAgendaTimeLabel(item.endAt) || ""
    })),
    appointments: appointments.map((item) => ({
      date: item.date,
      type: item.type,
      title: item.title,
      startTime: toAgendaTimeLabel(item.startAt) || "",
      endTime: toAgendaTimeLabel(item.endAt) || ""
    })),
    informational: informational.map((item) => ({
      date: item.date,
      type: item.type,
      title: item.title,
      startTime: toAgendaTimeLabel(item.startAt) || "",
      endTime: toAgendaTimeLabel(item.endAt) || ""
    })),
    occupiedWindows,
    bookableWindows: availability
      .filter((item) => toAgendaTimeLabel(item.startAt) && toAgendaTimeLabel(item.endAt))
      .map((item) => ({
        date: item.date,
        startTime: toAgendaTimeLabel(item.startAt) || "",
        endTime: toAgendaTimeLabel(item.endAt) || ""
      })),
    summary: {
      availabilityCount: availability.length,
      blockedCount: blocked.length,
      appointmentCount: appointments.length,
      informationalCount: informational.length,
      bookableWindowCount: availability.length
    }
  };
}

export function applyCommercialBotHandoff(tenantId: string, conversationId?: string): boolean {
  const data = readSaasData();
  const now = new Date().toISOString();
  let changed = false;

  const candidateConversations = data.conversations.filter(
    (conversation) => conversation.tenantId === tenantId && (!conversationId || conversation.id === conversationId)
  );

  for (const conversation of candidateConversations) {
    const inboundMessages = data.messages
      .filter(
        (message) =>
          message.tenantId === tenantId &&
          message.conversationId === conversation.id &&
          message.direction === "inbound"
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const latestInbound = inboundMessages[0];
    if (!latestInbound || !isCommercialHandoffTrigger(latestInbound.text)) {
      continue;
    }

    if (hasExistingBotHandoffMessage(data.messages, conversation.id, tenantId)) {
      continue;
    }

    const handoff = buildCommercialHandoffContent(inboundMessages);

    conversation.priority = "hot";
    conversation.leadStatus = "FOLLOW_UP";
    conversation.botEnabled = false;
    conversation.botFlowLock = "commerce";
    conversation.nextActionAt = now;
    conversation.nextActionNote = handoff.note;
    conversation.lastMessageAt = now;

    data.messages.push({
      id: newId("msg"),
      tenantId,
      conversationId: conversation.id,
      direction: "system",
      text: handoff.message,
      timestamp: now,
      status: "sent"
    });

    data.auditLog.unshift({
      id: newId("audit"),
      tenantId,
      action: "inbox_ai_event",
      entity: "inbox_ai_event",
      entityId: conversation.id,
      createdAt: now,
      metadata: {
        text: "Bot activo handoff comercial por intencion de avance",
        triggerText: latestInbound.text,
        handoff: "commercial",
        visitEligible: handoff.visitEligible,
        preference: handoff.preference
      }
    });

    changed = true;
  }

  if (changed) {
    writeSaasData(data);
  }

  return changed;
}

export function listInboxConversations(tenantId: string): Array<
  Conversation & {
    contact?: Contact;
    unreadCount: number;
    slaMinutes: number;
    lastMessagePreview?: string;
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
      const lastMessagePreview = messages[0]?.text;
      const baseTime = lastInbound ? new Date(lastInbound.timestamp).getTime() : new Date(conversation.lastMessageAt).getTime();
      const slaMinutes = Math.max(0, Math.floor((now - baseTime) / (1000 * 60)));
      return { ...conversation, contact, unreadCount, slaMinutes, lastMessagePreview, deal };
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

