export const BULK_STOCK_REASONS = ["initial_stock", "physical_count", "inventory_correction", "other"] as const;
export const MAX_BULK_STOCK_QUANTITY = 2_147_483_647;
export const MAX_BULK_STOCK_ITEMS = 2_000;

export type BulkStockReason = (typeof BULK_STOCK_REASONS)[number];

export type BulkStockProductSource = {
  productId: string;
  name: string;
  internalCode?: string | null;
  sku?: string | null;
  categoryName?: string | null;
  unitOfMeasure?: string | null;
  status?: string | null;
  inventoryTrackingMode?: "legacy" | "lot_based";
  currentQuantity: number;
};

export type BulkStockDraft = {
  productId: string;
  name: string;
  internalCode: string | null;
  sku: string | null;
  categoryName: string | null;
  unitOfMeasure: string | null;
  status: string | null;
  inventoryTrackingMode: "legacy" | "lot_based";
  expectedCurrentQuantity: number;
  rawTargetQuantity: string;
  conflict: {
    previousExpectedQuantity: number;
    currentQuantity: number;
  } | null;
};

export type BulkStockDrafts = Record<string, BulkStockDraft>;

export type BulkStockFilters = {
  search: string;
  stockFilter: "all" | "with_stock" | "without_stock";
};

export type BulkStockDraftValidation = {
  valid: boolean;
  targetQuantity: number | null;
  delta: number | null;
  error: "lot_based" | "invalid_quantity" | null;
};

export type BulkStockRequestItem = {
  productId: string;
  targetQuantity: number;
  expectedCurrentQuantity: number;
};

export type BulkStockSummary = {
  draftItems: number;
  changedItems: number;
  invalidItems: number;
  conflictItems: number;
  increases: number;
  reductions: number;
  unitsAdded: number;
  unitsRemoved: number;
};

export type BulkStockAttempt = {
  fingerprint: string;
  idempotencyKey: string;
};

export function updateBulkStockDraft(
  current: BulkStockDrafts,
  product: BulkStockProductSource,
  rawTargetQuantity: string
): BulkStockDrafts {
  const normalizedRaw = String(rawTargetQuantity ?? "");
  const existing = current[product.productId];
  const expectedCurrentQuantity = existing?.expectedCurrentQuantity ?? normalizeCurrentQuantity(product.currentQuantity);

  if (!normalizedRaw.trim()) {
    if (!existing) return current;
    const next = { ...current };
    delete next[product.productId];
    return next;
  }

  const parsed = parseBulkStockTarget(normalizedRaw);
  if (parsed !== null && parsed === expectedCurrentQuantity) {
    if (!existing) return current;
    const next = { ...current };
    delete next[product.productId];
    return next;
  }

  return {
    ...current,
    [product.productId]: {
      productId: product.productId,
      name: product.name,
      internalCode: product.internalCode || null,
      sku: product.sku || null,
      categoryName: product.categoryName || null,
      unitOfMeasure: product.unitOfMeasure || null,
      status: product.status || null,
      inventoryTrackingMode: product.inventoryTrackingMode === "lot_based" ? "lot_based" : "legacy",
      expectedCurrentQuantity,
      rawTargetQuantity: normalizedRaw,
      conflict: null
    }
  };
}

export function validateBulkStockDraft(draft: BulkStockDraft): BulkStockDraftValidation {
  if (draft.inventoryTrackingMode === "lot_based") {
    return { valid: false, targetQuantity: null, delta: null, error: "lot_based" };
  }
  const targetQuantity = parseBulkStockTarget(draft.rawTargetQuantity);
  if (targetQuantity === null) {
    return { valid: false, targetQuantity: null, delta: null, error: "invalid_quantity" };
  }
  return {
    valid: true,
    targetQuantity,
    delta: targetQuantity - draft.expectedCurrentQuantity,
    error: null
  };
}

export function buildBulkStockRequestItems(drafts: BulkStockDrafts): BulkStockRequestItem[] {
  return Object.values(drafts)
    .map((draft) => ({ draft, validation: validateBulkStockDraft(draft) }))
    .filter(({ validation }) => validation.valid && validation.targetQuantity !== null && validation.delta !== 0)
    .map(({ draft, validation }) => ({
      productId: draft.productId,
      targetQuantity: validation.targetQuantity as number,
      expectedCurrentQuantity: draft.expectedCurrentQuantity
    }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}

export function summarizeBulkStockDrafts(drafts: BulkStockDrafts): BulkStockSummary {
  const summary: BulkStockSummary = {
    draftItems: 0,
    changedItems: 0,
    invalidItems: 0,
    conflictItems: 0,
    increases: 0,
    reductions: 0,
    unitsAdded: 0,
    unitsRemoved: 0
  };

  Object.values(drafts).forEach((draft) => {
    summary.draftItems += 1;
    if (draft.conflict) summary.conflictItems += 1;
    const validation = validateBulkStockDraft(draft);
    if (!validation.valid || validation.delta === null) {
      summary.invalidItems += 1;
      return;
    }
    if (validation.delta === 0) return;
    summary.changedItems += 1;
    if (validation.delta > 0) {
      summary.increases += 1;
      summary.unitsAdded += validation.delta;
    } else {
      summary.reductions += 1;
      summary.unitsRemoved += Math.abs(validation.delta);
    }
  });

  return summary;
}

export function rebaseBulkStockConflict(
  current: BulkStockDrafts,
  conflict: { productId: string; currentQuantity: number }
): BulkStockDrafts {
  const draft = current[conflict.productId];
  const currentQuantity = normalizeCurrentQuantity(conflict.currentQuantity);
  if (!draft) return current;
  return {
    ...current,
    [conflict.productId]: {
      ...draft,
      expectedCurrentQuantity: currentQuantity,
      conflict: {
        previousExpectedQuantity: draft.expectedCurrentQuantity,
        currentQuantity
      }
    }
  };
}

export function isSemanticallyValidBulkStockResult(
  value: unknown,
  expectedItems: BulkStockRequestItem[]
) {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  const summary = result.summary as Record<string, unknown> | null;
  const items = result.items;
  if (typeof result.operationId !== "string" || !result.operationId.trim() || typeof result.idempotent !== "boolean") return false;
  if (!summary || typeof summary !== "object" || !Array.isArray(items) || items.length !== expectedItems.length) return false;

  const summaryFields = ["submittedItems", "changedItems", "unchangedItems", "increases", "reductions", "unitsAdded", "unitsRemoved"];
  if (!summaryFields.every((field) => isNonNegativeInteger(summary[field]))) return false;
  if (summary.submittedItems !== expectedItems.length) return false;
  if ((summary.changedItems as number) + (summary.unchangedItems as number) !== expectedItems.length) return false;

  const expectedById = new Map(expectedItems.map((item) => [item.productId, item]));
  const seen = new Set<string>();
  let changedItems = 0;
  let unchangedItems = 0;
  let increases = 0;
  let reductions = 0;
  let unitsAdded = 0;
  let unitsRemoved = 0;
  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object") return false;
    const item = rawItem as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId : "";
    const expected = expectedById.get(productId);
    if (!expected || seen.has(productId)) return false;
    seen.add(productId);
    if (!isNonNegativeInteger(item.previousQuantity) || !isNonNegativeInteger(item.targetQuantity)) return false;
    if (!Number.isInteger(item.delta) || item.delta !== (item.targetQuantity as number) - (item.previousQuantity as number)) return false;
    if (item.previousQuantity !== expected.expectedCurrentQuantity) return false;
    if (item.targetQuantity !== expected.targetQuantity) return false;
    if (!(["updated", "unchanged", "idempotent"] as unknown[]).includes(item.status)) return false;
    if (item.status === "updated" && (typeof item.movementId !== "string" || !item.movementId.trim())) return false;
    if (item.status === "unchanged" && item.delta !== 0) return false;
    if (item.movementId !== null && typeof item.movementId !== "string") return false;
    const delta = item.delta as number;
    if (delta === 0) {
      unchangedItems += 1;
    } else {
      changedItems += 1;
      if (delta > 0) {
        increases += 1;
        unitsAdded += delta;
      } else {
        reductions += 1;
        unitsRemoved += Math.abs(delta);
      }
    }
  }
  return (
    seen.size === expectedItems.length &&
    summary.changedItems === changedItems &&
    summary.unchangedItems === unchangedItems &&
    summary.increases === increases &&
    summary.reductions === reductions &&
    summary.unitsAdded === unitsAdded &&
    summary.unitsRemoved === unitsRemoved
  );
}

export function filterBulkStockDrafts(drafts: BulkStockDrafts, filters: BulkStockFilters): BulkStockDraft[] {
  const normalizedSearch = filters.search.trim().toLocaleLowerCase("es");
  return Object.values(drafts)
    .filter((draft) => {
      if (filters.stockFilter === "with_stock" && draft.expectedCurrentQuantity <= 0) return false;
      if (filters.stockFilter === "without_stock" && draft.expectedCurrentQuantity > 0) return false;
      if (!normalizedSearch) return true;
      return [draft.name, draft.internalCode, draft.sku, draft.categoryName]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es").includes(normalizedSearch));
    })
    .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }));
}

export function paginateBulkStockDrafts(
  drafts: BulkStockDrafts,
  filters: BulkStockFilters,
  requestedPage: number,
  pageSize: number
) {
  const filtered = filterBulkStockDrafts(drafts, filters);
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 50;
  const totalItems = filtered.length;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / safePageSize) : 0;
  const page = totalPages > 0 ? Math.min(Math.max(Number.isInteger(requestedPage) ? requestedPage : 1, 1), totalPages) : 1;
  const start = (page - 1) * safePageSize;
  return {
    items: filtered.slice(start, start + safePageSize),
    page,
    pageSize: safePageSize,
    totalItems,
    totalPages
  };
}

export function resolveInventoryPageCorrection(requestedPage: number, totalPages: number) {
  const safeRequestedPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const safeTotalPages = Number.isInteger(totalPages) && totalPages >= 0 ? totalPages : 0;
  const lastValidPage = Math.max(safeTotalPages, 1);
  return safeRequestedPage > lastValidPage ? lastValidPage : null;
}

export function buildBulkStockPayloadFingerprint(input: {
  reason: BulkStockReason;
  note: string | null;
  items: BulkStockRequestItem[];
}) {
  return JSON.stringify({
    reason: input.reason,
    note: input.note?.trim() || null,
    items: [...input.items].sort((left, right) => left.productId.localeCompare(right.productId))
  });
}

export function resolveBulkStockAttempt(
  previous: BulkStockAttempt | null,
  fingerprint: string,
  createKey: () => string = createBulkStockIdempotencyKey
): BulkStockAttempt {
  if (previous?.fingerprint === fingerprint) return previous;
  return { fingerprint, idempotencyKey: createKey() };
}

export function createBulkStockIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function parseBulkStockTarget(rawValue: string): number | null {
  const normalized = String(rawValue ?? "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_BULK_STOCK_QUANTITY ? value : null;
}

function normalizeCurrentQuantity(value: number) {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized >= 0 ? normalized : 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
