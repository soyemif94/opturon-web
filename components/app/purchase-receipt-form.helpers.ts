import type { PortalInventoryLocation, PortalProduct, PortalSupplier } from "@/lib/api";

export type PurchaseReceiptLineDraft = {
  key: string;
  productId: string;
  quantity: string;
  unitCost: string;
  lotNumber: string;
  expiresAt: string;
};

export type PurchaseReceiptFormDraft = {
  supplierId: string;
  locationId: string;
  receivedAt: string;
  documentNumber: string;
  notes: string;
  idempotencyKey: string;
  lines: PurchaseReceiptLineDraft[];
};

export type PurchaseReceiptFormValidation = {
  formError: string | null;
  fieldErrors: Record<string, string>;
  payload: {
    supplierId: string;
    locationId: string;
    receivedAt: string;
    documentNumber: string | null;
    notes: string | null;
    idempotencyKey: string;
    items: Array<{
      productId: string;
      quantity: string;
      unitCost?: string;
      lotNumber?: string;
      expiresAt?: string;
    }>;
  } | null;
};

const FALLBACK_UUID_PREFIX = "purchase-receipt";

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeLotNumber(value: unknown) {
  const raw = normalizeString(value);
  if (!raw) return null;
  return raw
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9._\- /]/g, "")
    .slice(0, 80)
    .trim() || null;
}

function parsePositiveNumber(value: string) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function countDecimalPlaces(value: string) {
  const normalized = normalizeString(value).replace(",", ".");
  if (!normalized.includes(".")) return 0;
  return normalized.split(".")[1]?.length || 0;
}

function formatQuantity(value: number, mode: "legacy" | "lot_based") {
  return mode === "lot_based" ? value.toFixed(3) : String(Math.trunc(value));
}

function formatUnitCost(value: number) {
  return value.toFixed(4);
}

export function createPurchaseReceiptAttemptKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${FALLBACK_UUID_PREFIX}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ensurePurchaseReceiptAttemptKey(currentKey?: string | null) {
  const normalized = normalizeString(currentKey);
  return normalized || createPurchaseReceiptAttemptKey();
}

export function createEmptyPurchaseReceiptLine(): PurchaseReceiptLineDraft {
  return {
    key: createPurchaseReceiptAttemptKey(),
    productId: "",
    quantity: "",
    unitCost: "",
    lotNumber: "",
    expiresAt: ""
  };
}

export function buildInitialPurchaseReceiptDraft(
  options: {
    supplierId?: string | null;
    locationId?: string | null;
    receivedAt?: string | null;
    idempotencyKey?: string | null;
    lines?: PurchaseReceiptLineDraft[];
  } = {}
): PurchaseReceiptFormDraft {
  const today = normalizeString(options.receivedAt) || new Date().toISOString().slice(0, 10);
  return {
    supplierId: normalizeString(options.supplierId),
    locationId: normalizeString(options.locationId),
    receivedAt: today,
    documentNumber: "",
    notes: "",
    idempotencyKey: ensurePurchaseReceiptAttemptKey(options.idempotencyKey),
    lines: Array.isArray(options.lines) && options.lines.length > 0 ? options.lines : [createEmptyPurchaseReceiptLine()]
  };
}

export function normalizeActiveSuppliers(items: PortalSupplier[]) {
  return (Array.isArray(items) ? items : [])
    .filter((supplier) => supplier.status === "active")
    .sort((left, right) => (left.displayName || left.legalName).localeCompare(right.displayName || right.legalName, "es"));
}

export function normalizeActiveLocations(items: PortalInventoryLocation[]) {
  return (Array.isArray(items) ? items : [])
    .filter((location) => location.active)
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.name.localeCompare(right.name, "es"));
}

export function normalizeReceiptProducts(items: PortalProduct[]) {
  return (Array.isArray(items) ? items : [])
    .filter((product) => product.status === "active")
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}

export function validatePurchaseReceiptDraft(
  draft: PurchaseReceiptFormDraft,
  options: {
    products: PortalProduct[];
    suppliers: PortalSupplier[];
    locations: PortalInventoryLocation[];
    todayISO?: string;
  }
): PurchaseReceiptFormValidation {
  const fieldErrors: Record<string, string> = {};
  const todayISO = normalizeString(options.todayISO) || new Date().toISOString().slice(0, 10);
  const productMap = new Map((Array.isArray(options.products) ? options.products : []).map((product) => [product.id, product]));
  const activeSupplierIds = new Set(normalizeActiveSuppliers(options.suppliers).map((supplier) => supplier.id));
  const activeLocationIds = new Set(normalizeActiveLocations(options.locations).map((location) => location.id));

  const supplierId = normalizeString(draft.supplierId);
  const locationId = normalizeString(draft.locationId);
  const receivedAt = normalizeString(draft.receivedAt);

  if (!supplierId) fieldErrors.supplierId = "Selecciona un proveedor activo.";
  else if (!activeSupplierIds.has(supplierId)) fieldErrors.supplierId = "El proveedor seleccionado ya no esta disponible.";

  if (!locationId) fieldErrors.locationId = "Selecciona una ubicacion activa.";
  else if (!activeLocationIds.has(locationId)) fieldErrors.locationId = "La ubicacion seleccionada ya no esta disponible.";

  if (!receivedAt) fieldErrors.receivedAt = "Indica la fecha de recepcion.";

  const lines = Array.isArray(draft.lines) ? draft.lines : [];
  if (lines.length === 0) {
    return {
      formError: "Agrega al menos una linea para confirmar la recepcion.",
      fieldErrors,
      payload: null
    };
  }

  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();
  const items: NonNullable<PurchaseReceiptFormValidation["payload"]>["items"] = [];

  lines.forEach((line, index) => {
    const product = productMap.get(normalizeString(line.productId));
    const fieldPrefix = `lines.${index}`;
    const quantityValue = parsePositiveNumber(line.quantity);
    const unitCostValue = normalizeString(line.unitCost) ? parsePositiveNumber(line.unitCost) : null;
    const normalizedLot = normalizeLotNumber(line.lotNumber);
    const expiresAt = normalizeString(line.expiresAt);

    if (!product || product.status !== "active") {
      fieldErrors[`${fieldPrefix}.productId`] = "Selecciona un producto activo.";
      return;
    }

    if (quantityValue === null || quantityValue <= 0) {
      fieldErrors[`${fieldPrefix}.quantity`] = "La cantidad debe ser mayor a cero.";
      return;
    }
    if (countDecimalPlaces(line.quantity) > 3) {
      fieldErrors[`${fieldPrefix}.quantity`] = "La cantidad admite hasta 3 decimales.";
      return;
    }

    if (unitCostValue !== null && unitCostValue < 0) {
      fieldErrors[`${fieldPrefix}.unitCost`] = "El costo unitario no puede ser negativo.";
      return;
    }
    if (normalizeString(line.unitCost) && countDecimalPlaces(line.unitCost) > 4) {
      fieldErrors[`${fieldPrefix}.unitCost`] = "El costo unitario admite hasta 4 decimales.";
      return;
    }

    const trackingMode = product.inventoryTrackingMode === "lot_based" ? "lot_based" : "legacy";
    if (trackingMode === "legacy" && !Number.isInteger(quantityValue)) {
      fieldErrors[`${fieldPrefix}.quantity`] = "Los productos legacy solo aceptan cantidades enteras.";
      return;
    }

    if (trackingMode === "legacy" && (normalizedLot || expiresAt)) {
      fieldErrors[`${fieldPrefix}.lotNumber`] = "Los productos legacy no aceptan lote ni vencimiento.";
      return;
    }

    if (trackingMode === "lot_based" && !normalizedLot) {
      fieldErrors[`${fieldPrefix}.lotNumber`] = "El lote es obligatorio para productos por lotes.";
      return;
    }

    if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      fieldErrors[`${fieldPrefix}.expiresAt`] = "Usa formato YYYY-MM-DD.";
      return;
    }

    if (expiresAt && expiresAt < todayISO) {
      fieldErrors[`${fieldPrefix}.expiresAt`] = "La fecha de vencimiento ya paso.";
      return;
    }

    const duplicateKey =
      trackingMode === "lot_based"
        ? `lot:${product.id}:${normalizedLot || ""}:${expiresAt || ""}`
        : `legacy:${product.id}`;

    if (seenKeys.has(duplicateKey)) {
      duplicateKeys.add(fieldPrefix);
      return;
    }
    seenKeys.add(duplicateKey);

    items?.push({
      productId: product.id,
      quantity: formatQuantity(quantityValue, trackingMode),
      unitCost: unitCostValue === null ? undefined : formatUnitCost(unitCostValue),
      lotNumber: trackingMode === "lot_based" ? normalizeString(line.lotNumber) : undefined,
      expiresAt: trackingMode === "lot_based" && expiresAt ? expiresAt : undefined
    });
  });

  if (duplicateKeys.size > 0) {
    duplicateKeys.forEach((fieldPrefix) => {
      fieldErrors[`${fieldPrefix}.productId`] = "No repitas una misma combinacion producto/lote en la misma recepcion.";
    });
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      formError: "Revisa los campos marcados antes de confirmar.",
      fieldErrors,
      payload: null
    };
  }

  return {
    formError: null,
    fieldErrors: {},
    payload: {
      supplierId,
      locationId,
      receivedAt: receivedAt.includes("T") ? receivedAt : `${receivedAt}T12:00:00.000Z`,
      documentNumber: normalizeString(draft.documentNumber) || null,
      notes: normalizeString(draft.notes) || null,
      idempotencyKey: ensurePurchaseReceiptAttemptKey(draft.idempotencyKey),
      items: items || []
    }
  };
}

export function mapPurchaseReceiptError(error: string | null | undefined) {
  const normalized = normalizeString(error);
  const messages: Record<string, string> = {
    missing_supplier_id: "Selecciona un proveedor.",
    invalid_supplier_id: "El proveedor seleccionado no es valido.",
    supplier_not_found: "El proveedor ya no esta disponible en este tenant.",
    supplier_inactive: "El proveedor esta inactivo y no admite nuevas recepciones.",
    missing_inventory_location_id: "Selecciona una ubicacion.",
    invalid_inventory_location_id: "La ubicacion seleccionada no es valida.",
    inventory_location_not_found: "La ubicacion ya no esta disponible.",
    inventory_location_inactive: "La ubicacion esta inactiva.",
    missing_purchase_receipt_received_at: "Indica la fecha de recepcion.",
    invalid_purchase_receipt_received_at: "La fecha de recepcion no es valida.",
    missing_purchase_receipt_idempotency_key: "No se pudo preparar el intento de recepcion. Reabre el formulario.",
    missing_purchase_receipt_items: "Agrega al menos una linea.",
    invalid_purchase_receipt_item_operational_fields: "La solicitud incluye campos internos no permitidos.",
    missing_product_id: "Selecciona un producto.",
    invalid_product_id: "El producto seleccionado no es valido.",
    product_not_found: "Uno de los productos ya no esta disponible.",
    product_deleted_cannot_receive_purchase_receipts: "Uno de los productos fue archivado y no admite nuevas recepciones.",
    invalid_purchase_receipt_quantity: "La cantidad debe ser mayor a cero.",
    legacy_purchase_receipt_quantity_must_be_integer: "Los productos legacy solo aceptan cantidades enteras.",
    invalid_purchase_receipt_unit_cost: "El costo unitario no puede ser negativo.",
    invalid_purchase_receipt_expires_at: "La fecha de vencimiento no es valida.",
    purchase_receipt_legacy_lot_not_allowed: "Los productos legacy no aceptan lote ni vencimiento.",
    purchase_receipt_lot_number_required: "Falta el lote en un producto por lotes.",
    purchase_receipt_lot_expired: "No puedes ingresar un lote con fecha de vencimiento pasada.",
    duplicate_purchase_receipt_item: "No repitas una misma combinacion producto/lote dentro de la recepcion.",
    inventory_lot_conflict_requires_new_physical_lot: "Ya existe ese lote con otro vencimiento. Revisa el lote o usa uno distinto.",
    purchase_receipt_idempotency_payload_mismatch: "Este intento ya se uso con otros datos. Recarga el formulario antes de reintentar.",
    inventory_negative_stock_blocked: "La operacion fue rechazada por control de stock.",
    inventory_zero_delta_not_allowed: "La operacion no genero variacion de stock.",
    purchase_receipt_not_found: "La recepcion solicitada no existe o no pertenece a este tenant."
  };
  return messages[normalized] || "No se pudo completar la operacion. Reintenta en unos minutos.";
}
