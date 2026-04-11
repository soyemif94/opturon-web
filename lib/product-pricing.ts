export function normalizeDiscountPercentage(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(100, Math.round(parsed * 100) / 100);
}

export function getDiscountedPrice(price: number, discountPercentage: number | string | null | undefined) {
  const normalizedDiscount = normalizeDiscountPercentage(discountPercentage);
  const normalizedPrice = Number.isFinite(price) ? price : 0;
  if (normalizedDiscount == null) {
    return {
      hasDiscount: false,
      discountPercentage: null,
      originalPrice: normalizedPrice,
      finalPrice: normalizedPrice
    };
  }

  const finalPrice = Math.max(0, Math.round(normalizedPrice * (1 - normalizedDiscount / 100) * 100) / 100);
  return {
    hasDiscount: true,
    discountPercentage: normalizedDiscount,
    originalPrice: normalizedPrice,
    finalPrice
  };
}
