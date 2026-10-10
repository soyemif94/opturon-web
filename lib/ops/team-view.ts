import type { OpsSellerLoadItem } from "@/components/app/ops/OpsSellerLoad";

function finiteMetric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeCurrency(value: unknown, fallback: unknown) {
  const currency = String(value || "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(currency)) return currency;
  const fallbackCurrency = String(fallback || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(fallbackCurrency) ? fallbackCurrency : "ARS";
}

/**
 * Keep the Team tab and its badge on the same canonical seller IDs. The
 * report endpoint may enrich rows, but it cannot add, remove, or rename the
 * sellers represented by the already-loaded OPS directory.
 */
export function mergeOpsTeamRows(
  canonicalRows: OpsSellerLoadItem[],
  reportRows: OpsSellerLoadItem[] | null,
  selectedSellerId = "",
  allowFallbackSales = true
): OpsSellerLoadItem[] {
  const reportById = new Map<string, OpsSellerLoadItem>();
  for (const row of reportRows || []) {
    const id = String(row?.sellerUserId || "").trim();
    if (id) reportById.set(id, row);
  }

  const rows: OpsSellerLoadItem[] = [];
  for (const canonical of canonicalRows) {
    const sellerUserId = String(canonical?.sellerUserId || "").trim();
    if (!sellerUserId || (selectedSellerId && sellerUserId !== selectedSellerId)) continue;

    const reported = reportById.get(sellerUserId);
    const sales = reported || (allowFallbackSales ? canonical : null);
    rows.push({
      sellerUserId,
      sellerName: String(reported?.sellerName || canonical.sellerName || "Vendedor"),
      totalActiveLeads: finiteMetric(reported ? reported.totalActiveLeads : canonical.totalActiveLeads),
      newLeads: finiteMetric(reported ? reported.newLeads : canonical.newLeads),
      overdueLeads: finiteMetric(reported ? reported.overdueLeads : canonical.overdueLeads),
      followUpLeads: finiteMetric(reported ? reported.followUpLeads : canonical.followUpLeads),
      coldLeads: finiteMetric(reported ? reported.coldLeads : canonical.coldLeads),
      recoveryLeads: finiteMetric(reported ? reported.recoveryLeads : canonical.recoveryLeads),
      ...(sales ? {
        totalOrders: finiteMetric(sales.totalOrders),
        totalPaidOrders: finiteMetric(sales.totalPaidOrders),
        totalRevenue: finiteMetric(sales.totalRevenue),
        averageTicket: finiteMetric(sales.averageTicket)
      } : {}),
      currency: safeCurrency(reported?.currency || canonical.currency, canonical.currency)
    });
  }

  return rows.sort((left, right) =>
    finiteMetric(right.totalRevenue) - finiteMetric(left.totalRevenue) ||
    right.totalActiveLeads - left.totalActiveLeads ||
    left.sellerName.localeCompare(right.sellerName)
  );
}
