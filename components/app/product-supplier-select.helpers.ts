export type ProductSupplierOption = {
  id: string;
  displayName?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  status?: "active" | "inactive" | null;
};

function normalizeString(value: string | null | undefined) {
  return String(value || "").trim();
}

function normalizeStatus(value: string | null | undefined): "active" | "inactive" {
  return normalizeString(value).toLowerCase() === "inactive" ? "inactive" : "active";
}

export function resolveProductSupplierLabel(supplier: ProductSupplierOption) {
  return normalizeString(supplier.tradeName) || normalizeString(supplier.legalName) || normalizeString(supplier.displayName);
}

export function normalizeProductSupplierOptions(items: unknown): ProductSupplierOption[] {
  if (!Array.isArray(items)) return [];

  const normalized: ProductSupplierOption[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const supplier = item as ProductSupplierOption;
    const id = normalizeString(supplier.id);
    const label = resolveProductSupplierLabel(supplier);
    if (!id || !label) continue;
    normalized.push({
      id,
      displayName: normalizeString(supplier.displayName) || null,
      legalName: normalizeString(supplier.legalName) || null,
      tradeName: normalizeString(supplier.tradeName) || null,
      status: normalizeStatus(supplier.status)
    });
  }

  return normalized;
}

export function buildProductSupplierOptions(
  suppliers: ProductSupplierOption[],
  value: string,
  currentSupplierLabel?: string | null,
  currentSupplierStatus?: "active" | "inactive" | null
) {
  const activeSuppliers = suppliers.filter((supplier) => normalizeStatus(supplier.status) === "active");
  const selectedSupplier = suppliers.find((supplier) => supplier.id === value) || null;

  if (selectedSupplier) {
    if (normalizeStatus(selectedSupplier.status) === "inactive") {
      return [selectedSupplier, ...activeSuppliers.filter((supplier) => supplier.id !== selectedSupplier.id)];
    }
    return activeSuppliers;
  }

  if (value && normalizeString(currentSupplierLabel)) {
    return [
      {
        id: value,
        displayName: normalizeString(currentSupplierLabel),
        status: normalizeStatus(currentSupplierStatus)
      },
      ...activeSuppliers
    ];
  }

  return activeSuppliers;
}
