type StockBadgeVariant = "success" | "warning" | "danger";

export type StockState = {
  label: string;
  variant: StockBadgeVariant;
  isOutOfStock: boolean;
  isLowStock: boolean;
};

export function getStockState(stock: number): StockState {
  const safeStock = Number.isFinite(stock) ? Number(stock) : 0;

  if (safeStock <= 0) {
    return {
      label: "Sin stock",
      variant: "danger",
      isOutOfStock: true,
      isLowStock: false
    };
  }

  if (safeStock <= 5) {
    return {
      label: "Stock bajo",
      variant: "warning",
      isOutOfStock: false,
      isLowStock: true
    };
  }

  return {
    label: "Disponible",
    variant: "success",
    isOutOfStock: false,
    isLowStock: false
  };
}
