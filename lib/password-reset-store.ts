import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type ResetTokenRecord = {
  id: string;
  email: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
};

type AuthRuntimeData = {
  passwordOverrides: Record<string, string>;
  resetTokens: ResetTokenRecord[];
};

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "auth-runtime.json");
let memoryStore: AuthRuntimeData | null = null;
let warnedAboutMemoryStore = false;

function emptyData(): AuthRuntimeData {
  return {
    passwordOverrides: {},
    resetTokens: []
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function warnMemoryStore(reason: unknown) {
  if (warnedAboutMemoryStore) return;
  warnedAboutMemoryStore = true;
  console.warn("[password-reset-store] Falling back to in-memory store.", reason);
}

function normalizeData(parsed?: Partial<AuthRuntimeData> | null): AuthRuntimeData {
  return {
    passwordOverrides:
      parsed?.passwordOverrides && typeof parsed.passwordOverrides === "object" ? parsed.passwordOverrides : {},
    resetTokens: Array.isArray(parsed?.resetTokens) ? parsed!.resetTokens : []
  };
}

function readStore(): AuthRuntimeData {
  if (memoryStore) return clone(memoryStore);

  try {
    if (!existsSync(DATA_FILE)) {
      const data = emptyData();
      memoryStore = clone(data);
      return clone(data);
    }

    const raw = readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuthRuntimeData>;
    const data = normalizeData(parsed);
    memoryStore = clone(data);
    return clone(data);
  } catch (error) {
    warnMemoryStore(error);
    const data = emptyData();
    memoryStore = clone(data);
    return clone(data);
  }
}

function writeStore(data: AuthRuntimeData) {
  const normalized = normalizeData(data);
  memoryStore = clone(normalized);

  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(normalized, null, 2), "utf8");
  } catch (error) {
    warnMemoryStore(error);
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

export function getPasswordOverride(email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return undefined;
  const data = readStore();
  return data.passwordOverrides[normalized];
}

export function setPasswordOverride(email: string, passwordHash: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return;
  const data = readStore();
  data.passwordOverrides[normalized] = passwordHash;
  writeStore(data);
}

export function createPasswordResetToken(input: { email: string; userId: string; expiresInMinutes?: number }) {
  const email = String(input.email || "").trim().toLowerCase();
  const expiresInMinutes = Math.max(5, Math.min(120, Number(input.expiresInMinutes || 30)));
  const token = randomBytes(32).toString("hex");
  const data = readStore();
  const now = Date.now();

  data.resetTokens = data.resetTokens.filter(
    (item) => item.usedAt || new Date(item.expiresAt).getTime() > now
  );

  data.resetTokens.push({
    id: newId("reset"),
    email,
    userId: input.userId,
    tokenHash: hashToken(token),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + expiresInMinutes * 60 * 1000).toISOString()
  });

  writeStore(data);
  return token;
}

export function validatePasswordResetToken(token: string) {
  const tokenHash = hashToken(String(token || ""));
  const data = readStore();
  const now = Date.now();
  const match = data.resetTokens.find((item) => item.tokenHash === tokenHash);
  if (!match) return null;
  if (match.usedAt) return null;
  if (new Date(match.expiresAt).getTime() <= now) return null;
  return { email: match.email, userId: match.userId };
}

export function consumePasswordResetToken(token: string) {
  const tokenHash = hashToken(String(token || ""));
  const data = readStore();
  const now = Date.now();
  const match = data.resetTokens.find((item) => item.tokenHash === tokenHash);
  if (!match) return null;
  if (match.usedAt) return null;
  if (new Date(match.expiresAt).getTime() <= now) return null;
  match.usedAt = new Date(now).toISOString();
  writeStore(data);
  return { email: match.email, userId: match.userId };
}
