type StockBadgeVariant = "success" | "warning" | "danger";

export type StockState = {
  label: string;
  variant: StockBadgeVariant;
  isOutOfStock: boolean;
  isLowStock: boolean;
};

export type InventoryAlertProduct<T> = {
  product: T;
  stock: number;
  state: StockState;
};

export type InventoryAlerts<T> = {
  outOfStockCount: number;
  lowStockCount: number;
  activeCount: number;
  attentionProducts: Array<InventoryAlertProduct<T>>;
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

export function getInventoryAlerts<T>(
  products: T[],
  options: {
    isActive: (product: T) => boolean;
    getStock: (product: T) => number;
  }
): InventoryAlerts<T> {
  const activeProducts = products.filter(options.isActive);
  const attentionProducts: Array<InventoryAlertProduct<T>> = [];
  let outOfStockCount = 0;
  let lowStockCount = 0;

  for (const product of activeProducts) {
    const stock = options.getStock(product);
    const state = getStockState(stock);

    if (state.isOutOfStock) {
      outOfStockCount += 1;
      attentionProducts.push({ product, stock, state });
      continue;
    }

    if (state.isLowStock) {
      lowStockCount += 1;
      attentionProducts.push({ product, stock, state });
    }
  }

  return {
    outOfStockCount,
    lowStockCount,
    activeCount: activeProducts.length,
    attentionProducts
  };
}
