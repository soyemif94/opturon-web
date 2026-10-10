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
export type OpsReportQueueState = "idle" | "queued" | "generating" | "downloading" | "error";
export type OpsReportQueueSnapshot = {
  state: OpsReportQueueState;
  queuePosition: number | null;
  safeErrorCode?: string | null;
};

export const OPS_REPORT_EXPORT_TIMEOUT_MS = 240_000;

const idleSnapshot: OpsReportQueueSnapshot = Object.freeze({ state: "idle", queuePosition: null, safeErrorCode: null });
const snapshots = new Map<string, OpsReportQueueSnapshot>();
const listeners = new Set<() => void>();
const queue: Array<{ key: string; run: (setStage: (stage: "downloading") => void) => Promise<void> }> = [];
let activeJob: (typeof queue)[number] | null = null;

function reportKey(report: OpsReportType, format: OpsReportDownloadFormat) {
  return `${report}:${format}`;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(key: string, snapshot: OpsReportQueueSnapshot) {
  const current = snapshots.get(key) || idleSnapshot;
  if (current.state === snapshot.state && current.queuePosition === snapshot.queuePosition && current.safeErrorCode === snapshot.safeErrorCode) return;
  snapshots.set(key, snapshot);
  notify();
}

function refreshQueuePositions() {
  queue.forEach((job, index) => {
    setSnapshot(job.key, { state: "queued", queuePosition: index + 1, safeErrorCode: null });
  });
}

function safeFailureCode(error: unknown) {
  if (error && typeof error === "object" && "safeErrorCode" in error && typeof error.safeErrorCode === "string") {
    return error.safeErrorCode;
  }
  if (error && typeof error === "object" && "name" in error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "request_timeout";
  }
  return "download_failed";
}

function pumpQueue() {
  if (activeJob) return;
  const job = queue.shift();
  if (!job) return;

  activeJob = job;
  setSnapshot(job.key, { state: "generating", queuePosition: null, safeErrorCode: null });
  refreshQueuePositions();

  void (async () => {
    try {
      await job.run(() => {
        if (activeJob === job) setSnapshot(job.key, { state: "downloading", queuePosition: null, safeErrorCode: null });
      });
      setSnapshot(job.key, idleSnapshot);
    } catch (error) {
      setSnapshot(job.key, { state: "error", queuePosition: null, safeErrorCode: safeFailureCode(error) });
    } finally {
      activeJob = null;
      refreshQueuePositions();
      notify();
      pumpQueue();
    }
  })();
}

export function enqueueOpsReportDownload(
  report: OpsReportType,
  format: OpsReportDownloadFormat,
  run: (setStage: (stage: "downloading") => void) => Promise<void>
) {
  const key = reportKey(report, format);
  const state = getOpsReportQueueSnapshot(report, format).state;
  if (state === "queued" || state === "generating" || state === "downloading") return false;

  queue.push({ key, run });
  setSnapshot(key, { state: "queued", queuePosition: queue.length, safeErrorCode: null });
  refreshQueuePositions();
  pumpQueue();
  return true;
}

export function getOpsReportQueueSnapshot(report: OpsReportType, format: OpsReportDownloadFormat) {
  return snapshots.get(reportKey(report, format)) || idleSnapshot;
}

export function hasActiveOpsReportExports() {
  return activeJob !== null || queue.length > 0;
}

export function subscribeToOpsReportQueue(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOpsReportQueueServerSnapshot() {
  return idleSnapshot;
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

const SAFE_REPORT_ERROR_CODES = new Set([
  "ops_access_required",
  "ops_report_backend_unavailable",
  "ops_report_not_found",
  "invalid_report_filters",
  "invalid_report_date_range",
  "report_too_large_apply_product_filter",
  "report_too_large_apply_date_or_product_filter",
  "report_too_large_apply_expiration_product_or_supplier_filter",
  "ops_report_generation_failed"
]);

export class OpsReportDownloadError extends Error {
  readonly status: number | null;
  readonly code: "http_error" | "invalid_content_type" | "invalid_content_disposition" | "invalid_filename";
  readonly safeErrorCode: string;
  readonly requestId: string | null;
  readonly contentType: string | null;
  readonly phase: string | null;

  constructor(
    code: OpsReportDownloadError["code"],
    status: number | null = null,
    diagnostics: { safeErrorCode?: string; requestId?: string | null; contentType?: string | null; phase?: string | null } = {}
  ) {
    super(code);
    this.name = "OpsReportDownloadError";
    this.code = code;
    this.status = status;
    this.safeErrorCode = diagnostics.safeErrorCode || code;
    this.requestId = diagnostics.requestId || null;
    this.contentType = diagnostics.contentType || null;
    this.phase = diagnostics.phase || null;
  }
}

export const OpsCsvDownloadError = OpsReportDownloadError;

export async function parseOpsReportDownloadResponse(
  response: Pick<Response, "ok" | "status" | "headers" | "blob"> & { clone?: () => Pick<Response, "json"> },
  format: OpsReportDownloadFormat
) {
  const contentType = response.headers.get("content-type") || "";
  const requestId = response.headers.get("x-request-id");
  const phase = response.headers.get("x-ops-report-phase");
  if (!response.ok) {
    const body = await response.clone?.().json().catch(() => null) as { error?: unknown } | null;
    const rawCode = typeof body?.error === "string" ? body.error : "";
    const safeErrorCode = SAFE_REPORT_ERROR_CODES.has(rawCode) ? rawCode : "http_error";
    throw new OpsReportDownloadError("http_error", response.status, { safeErrorCode, requestId, contentType, phase });
  }

  const validContentType = format === "xlsx"
    ? /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet\s*$/i.test(contentType.trim())
    : /^text\/csv\s*;\s*charset\s*=\s*"?utf-8"?\s*$/i.test(contentType.trim());
  if (!validContentType) {
    throw new OpsReportDownloadError("invalid_content_type", response.status, { requestId, contentType, phase });
  }

  const contentDisposition = response.headers.get("content-disposition") || "";
  if (!/^attachment(?:\s*;|$)/i.test(contentDisposition.trim())) {
    throw new OpsReportDownloadError("invalid_content_disposition", response.status, { requestId, contentType, phase });
  }

  const filenameMatch = /(?:^|;)\s*filename="([^"]+)"/i.exec(contentDisposition);
  const filename = filenameMatch?.[1] || "";
  const extension = format === "xlsx" ? "xlsx" : "csv";
  if (!new RegExp(`^opturon-[a-z0-9._-]{1,110}\\.${extension}$`, "i").test(filename) || filename.includes("..")) {
    throw new OpsReportDownloadError("invalid_filename", response.status, { requestId, contentType, phase });
  }

  return { blob: await response.blob(), filename, requestId, contentType, phase };
}

export async function parseOpsCsvDownloadResponse(response: Parameters<typeof parseOpsReportDownloadResponse>[0]) {
  return parseOpsReportDownloadResponse(response, "csv");
}
