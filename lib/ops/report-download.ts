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

export function buildOpsReportUrl(report: OpsReportType, filters: OpsReportFilters = {}) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sellerId) params.set("sellerId", filters.sellerId);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.channel && filters.channel !== "all") params.set("channel", filters.channel);
  if (report !== "sales" && filters.operationalState && filters.operationalState !== "all") {
    params.set("operationalState", filters.operationalState);
  }
  if (filters.customer?.trim()) params.set("customer", filters.customer.trim());
  if (filters.product?.trim()) params.set("product", filters.product.trim());
  if (report === "expirations" && filters.supplier?.trim()) params.set("supplier", filters.supplier.trim());
  if (report === "expirations" && filters.warehouse?.trim()) params.set("warehouse", filters.warehouse.trim());
  return `/api/app/ops/reports/${report}${params.size ? `?${params.toString()}` : ""}`;
}

export class OpsCsvDownloadError extends Error {
  readonly status: number | null;
  readonly code: "http_error" | "invalid_content_type" | "invalid_content_disposition" | "invalid_filename";

  constructor(code: OpsCsvDownloadError["code"], status: number | null = null) {
    super(code);
    this.name = "OpsCsvDownloadError";
    this.code = code;
    this.status = status;
  }
}

export async function parseOpsCsvDownloadResponse(response: Pick<Response, "ok" | "status" | "headers" | "blob">) {
  if (!response.ok) throw new OpsCsvDownloadError("http_error", response.status);

  const contentType = response.headers.get("content-type") || "";
  if (!/^text\/csv\s*;\s*charset\s*=\s*"?utf-8"?\s*$/i.test(contentType.trim())) {
    throw new OpsCsvDownloadError("invalid_content_type", response.status);
  }

  const contentDisposition = response.headers.get("content-disposition") || "";
  if (!/^attachment(?:\s*;|$)/i.test(contentDisposition.trim())) {
    throw new OpsCsvDownloadError("invalid_content_disposition", response.status);
  }

  const filenameMatch = /(?:^|;)\s*filename="([^"]+)"/i.exec(contentDisposition);
  const filename = filenameMatch?.[1] || "";
  if (!/^opturon-[a-z0-9._-]{1,110}\.csv$/i.test(filename) || filename.includes("..")) {
    throw new OpsCsvDownloadError("invalid_filename", response.status);
  }

  return { blob: await response.blob(), filename };
}
