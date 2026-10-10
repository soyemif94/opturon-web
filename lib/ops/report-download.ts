export const OPS_REPORT_TYPES = ["sales", "sellers", "followups", "inventory", "movements", "expirations"] as const;
export type OpsReportType = typeof OPS_REPORT_TYPES[number];

export type OpsReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  sellerId?: string;
  stage?: string;
  channel?: string;
  operationalState?: string;
  customer?: string;
  product?: string;
  supplier?: string;
  warehouse?: string;
};

export type OpsReportDownloadFormat = "xlsx" | "csv";

const reportDownloadInFlight = new Set<string>();

export function acquireOpsReportDownload(report: OpsReportType, format: OpsReportDownloadFormat) {
  const key = `${report}:${format}`;
  if (reportDownloadInFlight.has(key)) return false;
  reportDownloadInFlight.add(key);
  return true;
}

export function releaseOpsReportDownload(report: OpsReportType, format: OpsReportDownloadFormat) {
  reportDownloadInFlight.delete(`${report}:${format}`);
}

export function buildOpsReportUrl(report: OpsReportType, filters: OpsReportFilters = {}) {
  const params = new URLSearchParams();
  const dateFilteredReports: OpsReportType[] = ["sales", "sellers", "followups", "movements", "expirations"];
  const sellerFilteredReports: OpsReportType[] = ["sales", "sellers", "followups"];
  const stageFilteredReports: OpsReportType[] = ["sales", "sellers", "followups"];
  const channelFilteredReports: OpsReportType[] = ["sales", "sellers", "followups"];
  const operationalStateReports: OpsReportType[] = ["sellers", "followups"];
  if (dateFilteredReports.includes(report) && filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (dateFilteredReports.includes(report) && filters.dateTo) params.set("dateTo", filters.dateTo);
  if (sellerFilteredReports.includes(report) && filters.sellerId) params.set("sellerId", filters.sellerId);
  if (stageFilteredReports.includes(report) && filters.stage) params.set("stage", filters.stage);
  if (channelFilteredReports.includes(report) && filters.channel && filters.channel !== "all") params.set("channel", filters.channel);
  if (operationalStateReports.includes(report) && filters.operationalState && filters.operationalState !== "all") {
    params.set("operationalState", filters.operationalState);
  }
  if (report === "sales" && filters.customer?.trim()) params.set("customer", filters.customer.trim());
  if (report === "sales" && filters.product?.trim()) params.set("product", filters.product.trim());
  if (report === "sellers" && filters.customer?.trim()) params.set("customer", filters.customer.trim());
  if (report === "sellers" && filters.product?.trim()) params.set("product", filters.product.trim());
  if (report === "followups" && filters.customer?.trim()) params.set("customer", filters.customer.trim());
  if (report === "inventory" && filters.product?.trim()) params.set("product", filters.product.trim());
  if (report === "movements" && filters.product?.trim()) params.set("product", filters.product.trim());
  if (report === "expirations" && filters.product?.trim()) params.set("product", filters.product.trim());
  if (report === "expirations" && filters.supplier?.trim()) params.set("supplier", filters.supplier.trim());
  if (report === "expirations" && filters.warehouse?.trim()) params.set("warehouse", filters.warehouse.trim());
  return `/api/app/ops/reports/${report}${params.size ? `?${params.toString()}` : ""}`;
}

export function withOpsReportFormat(url: string, format: OpsReportDownloadFormat) {
  const [pathname, query = ""] = url.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("format", format);
  return `${pathname}?${params.toString()}`;
}

export class OpsReportDownloadError extends Error {
  readonly status: number | null;
  readonly code: "http_error" | "invalid_content_type" | "invalid_content_disposition" | "invalid_filename";

  constructor(code: OpsReportDownloadError["code"], status: number | null = null) {
    super(code);
    this.name = "OpsReportDownloadError";
    this.code = code;
    this.status = status;
  }
}

export const OpsCsvDownloadError = OpsReportDownloadError;

export async function parseOpsReportDownloadResponse(
  response: Pick<Response, "ok" | "status" | "headers" | "blob">,
  format: OpsReportDownloadFormat
) {
  if (!response.ok) throw new OpsReportDownloadError("http_error", response.status);

  const contentType = response.headers.get("content-type") || "";
  const validContentType = format === "xlsx"
    ? /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet\s*$/i.test(contentType.trim())
    : /^text\/csv\s*;\s*charset\s*=\s*"?utf-8"?\s*$/i.test(contentType.trim());
  if (!validContentType) {
    throw new OpsReportDownloadError("invalid_content_type", response.status);
  }

  const contentDisposition = response.headers.get("content-disposition") || "";
  if (!/^attachment(?:\s*;|$)/i.test(contentDisposition.trim())) {
    throw new OpsReportDownloadError("invalid_content_disposition", response.status);
  }

  const filenameMatch = /(?:^|;)\s*filename="([^"]+)"/i.exec(contentDisposition);
  const filename = filenameMatch?.[1] || "";
  const extension = format === "xlsx" ? "xlsx" : "csv";
  if (!new RegExp(`^opturon-[a-z0-9._-]{1,110}\\.${extension}$`, "i").test(filename) || filename.includes("..")) {
    throw new OpsReportDownloadError("invalid_filename", response.status);
  }

  return { blob: await response.blob(), filename };
}

export async function parseOpsCsvDownloadResponse(response: Pick<Response, "ok" | "status" | "headers" | "blob">) {
  return parseOpsReportDownloadResponse(response, "csv");
}
