export function normalizeCurrencyCode(currency: string | null | undefined, fallback = "ARS") {
  const normalized = String(currency || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);

  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}

export function formatMoney(amount: number | null | undefined, currency = "ARS") {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const safeCurrency = normalizeCurrencyCode(currency);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 2
  }).format(safeAmount);
}

export const INVOICE_DOCUMENT_KIND_OPTIONS = [
  { value: "internal_invoice", label: "Comprobante interno" },
  { value: "proforma", label: "Proforma" },
  { value: "order_summary", label: "Resumen de pedido" }
] as const;

export const BILLING_DOCUMENT_SELECTOR_OPTIONS = [
  { value: "internal_invoice", label: "Comprobante interno" },
  { value: "proforma", label: "Proforma" },
  { value: "order_summary", label: "Resumen de pedido" },
  { value: "credit_note", label: "Nota de credito interna" }
] as const;

export const BILLING_CURRENCY_OPTIONS = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" }
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "bank_transfer", label: "Transferencia" },
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "combined", label: "Combinados" }
] as const;

export const PAYMENT_DESTINATION_OPTIONS = [
  { value: "cash_drawer", label: "Caja" },
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "uala", label: "Uala" },
  { value: "naranja_x", label: "Naranja X" },
  { value: "santander", label: "Santander" },
  { value: "galicia", label: "Galicia" },
  { value: "unclassified", label: "Sin clasificar" },
  { value: "other", label: "Otro" }
] as const;

export function getInvoiceDocumentKindLabel(metadata: Record<string, unknown> | null | undefined) {
  const raw = String(metadata?.documentKind || "").trim().toLowerCase();
  if (["invoice_a", "invoice_b", "invoice_c"].includes(raw)) return "Comprobante interno";
  if (raw === "delivery_note") return "Resumen de pedido";
  const match = INVOICE_DOCUMENT_KIND_OPTIONS.find((option) => option.value === raw);
  return match?.label || "Comprobante interno";
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

export function normalizePaymentDestinationValue(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = new Set<string>(PAYMENT_DESTINATION_OPTIONS.map((option) => option.value));
  return allowed.has(normalized) ? normalized : "other";
}

export function getPaymentDestinationLabel(value: string | null | undefined) {
  const normalized = normalizePaymentDestinationValue(value);
  const match = PAYMENT_DESTINATION_OPTIONS.find((option) => option.value === normalized);
  return match?.label || "Otro";
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
  const lower = normalized.toLowerCase();
  if (lower === "invoice") return "Comprobante";
  if (lower === "credit_note") return "Nota de credito";
  if (lower === "issued") return "Emitido";
  if (lower === "ready_for_accountant") return "Listo para contador";
  if (lower === "delivered_to_accountant") return "Entregado al contador";
  if (lower === "invoiced_by_accountant") return "Facturado por contador";
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
