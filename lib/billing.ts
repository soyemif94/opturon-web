export function formatMoney(amount: number | null | undefined, currency = "ARS") {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(safeAmount);
}

export const INVOICE_DOCUMENT_KIND_OPTIONS = [
  { value: "invoice_a", label: "Factura A" },
  { value: "invoice_b", label: "Factura B" },
  { value: "invoice_c", label: "Factura C" },
  { value: "delivery_note", label: "Remito" }
] as const;

export const BILLING_DOCUMENT_SELECTOR_OPTIONS = [
  { value: "invoice_a", label: "Factura A" },
  { value: "invoice_b", label: "Factura B" },
  { value: "invoice_c", label: "Factura C" },
  { value: "delivery_note", label: "Remito" },
  { value: "credit_note", label: "Nota de credito vinculada" }
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "bank_transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "combined", label: "Combinados" }
] as const;

export function getInvoiceDocumentKindLabel(metadata: Record<string, unknown> | null | undefined) {
  const raw = String(metadata?.documentKind || "").trim().toLowerCase();
  const match = INVOICE_DOCUMENT_KIND_OPTIONS.find((option) => option.value === raw);
  return match?.label || "Factura C";
}

export function parseLocalizedMoneyInput(value: string | number | null | undefined) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\$/g, "");

  if (!raw) return NaN;

  const hasComma = raw.includes(",");
  const dotCount = (raw.match(/\./g) || []).length;

  let normalized = raw;

  if (hasComma) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (dotCount > 1) {
    normalized = normalized.replace(/\./g, "");
  } else if (dotCount === 1) {
    const [whole, fraction = ""] = normalized.split(".");
    normalized = fraction.length === 3 ? `${whole}${fraction}` : `${whole}.${fraction}`;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : NaN;
}

export function normalizePaymentMethodValue(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "other") return "combined";
  return normalized;
}

export function formatDateLabel(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatDateTimeLabel(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function relativeDateLabel(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

export function balanceImpactLabel(balanceImpact?: { sign?: string; amount?: number } | null) {
  if (!balanceImpact?.sign || !Number.isFinite(Number(balanceImpact.amount))) {
    return "Sin impacto";
  }
  if (balanceImpact.sign === "negative") {
    return `Credito ${Math.abs(Number(balanceImpact.amount)).toFixed(2)}`;
  }
  if (balanceImpact.sign === "positive") {
    return `Debito ${Number(balanceImpact.amount).toFixed(2)}`;
  }
  return "Sin impacto";
}

export function badgeToneByStatus(value: string | null | undefined): "muted" | "warning" | "success" | "danger" | "outline" {
  const normalized = String(value || "").trim().toLowerCase();
  if (["issued", "active", "recorded", "paid"].includes(normalized)) return "success";
  if (["draft", "partially_paid", "unpaid"].includes(normalized)) return "warning";
  if (["void", "archived", "cancelled", "overpaid"].includes(normalized)) return "danger";
  if (["credit_note", "invoice"].includes(normalized)) return "outline";
  return "muted";
}

export function titleCaseLabel(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  if (!normalized) return "-";
  const dictionary: Record<string, string> = {
    invoice: "Factura",
    credit_note: "Nota de crédito",
    draft: "Borrador",
    issued: "Emitida",
    void: "Anulada",
    recorded: "Registrado",
    unpaid: "Sin cobrar",
    partially_paid: "Cobro parcial",
    paid: "Cobrada",
    overpaid: "Sobrepagada",
    not_applicable: "No aplica",
    bank_transfer: "Transferencia",
    cash: "Efectivo",
    card: "Tarjeta",
    other: "Combinados",
    combined: "Combinados",
    active: "Activo",
    inactive: "Inactivo",
    archived: "Archivado",
    internal_only: "Solo interno",
    external_provider: "Proveedor externo",
    synced_external: "Sincronizado",
    positive: "Debito",
    negative: "Credito",
    success: "Exito",
    warning: "Advertencia",
    danger: "Riesgo"
  };
  const lower = normalized.toLowerCase();
  if (dictionary[lower]) return dictionary[lower];
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function quantizeMoney(value: number | string | null | undefined) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

export function calculateInvoiceLineAmounts({
  quantity,
  unitPrice,
  taxRate
}: {
  quantity: number;
  unitPrice: number;
  taxRate: number;
}) {
  const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
  const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
  const safeTaxRate = Number.isFinite(taxRate) ? taxRate : 0;
  const subtotalAmount = quantizeMoney(safeQuantity * safeUnitPrice);
  const totalAmount = quantizeMoney(subtotalAmount * (1 + safeTaxRate / 100));

  return {
    subtotalAmount,
    totalAmount
  };
}
