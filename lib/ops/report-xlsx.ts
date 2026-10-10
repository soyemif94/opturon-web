import ExcelJS from "exceljs";

export type OpsXlsxColumnKind = "text" | "date" | "dateOnly" | "number" | "currency";

export type OpsXlsxColumn = {
  header: string;
  key: string;
  kind?: OpsXlsxColumnKind;
  width?: number;
  wrapText?: boolean;
};

export type OpsXlsxSheet = {
  name: string;
  columns: OpsXlsxColumn[];
  rows: Array<Record<string, unknown>>;
};

export type OpsXlsxReport = {
  title: string;
  generatedAt?: Date;
  period: string;
  filters: Array<{ label: string; value: string }>;
  columns: OpsXlsxColumn[];
  rows: Array<Record<string, unknown>>;
  additionalSheets?: OpsXlsxSheet[];
};

const HEADER_ROW = 6;
const REPORT_TIME_ZONE = "America/Argentina/Buenos_Aires";
const DATE_TIME_FORMAT = "dd/mm/yyyy hh:mm";
const DATE_FORMAT = "dd/mm/yyyy";
const NUMBER_FORMAT = "#,##0.######;[Red]-#,##0.######";
const CURRENCY_FORMAT = "#,##0.00;[Red]-#,##0.00";

export function sanitizeSpreadsheetText(value: string) {
  return /^[\u0000-\u0020]*[=+@\-]/.test(value) ? `'${value}` : value;
}

function dateAtReportWallTime(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value || 0);
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"), value.getUTCMilliseconds()));
}

function toExcelCellValue(value: unknown, kind: OpsXlsxColumnKind = "text") {
  if (kind === "date" || kind === "dateOnly") {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : kind === "dateOnly" ? new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())) : dateAtReportWallTime(value);
    if (typeof value !== "string" || !value.trim()) return null;
    if (kind === "dateOnly" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const [year, month, day] = value.trim().split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : kind === "dateOnly" ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) : dateAtReportWallTime(date);
  }
  if (kind === "number" || kind === "currency") {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim()) {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }
    return null;
  }
  if (typeof value === "string") return sanitizeSpreadsheetText(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  return value == null ? "" : "";
}

function styleReportSheet(workbook: ExcelJS.Workbook, sheet: OpsXlsxSheet, report: OpsXlsxReport) {
  const worksheet = workbook.addWorksheet(sheet.name);
  const columnCount = Math.max(sheet.columns.length, 1);
  worksheet.columns = sheet.columns.map((column) => ({
    key: column.key,
    width: Math.min(48, Math.max(12, column.width || Math.min(34, column.header.length + 5)))
  }));
  worksheet.mergeCells(1, 1, 1, columnCount);
  const title = worksheet.getCell(1, 1);
  title.value = sanitizeSpreadsheetText(report.title);
  title.font = { name: "Aptos Display", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10213D" } };
  title.alignment = { vertical: "middle" };
  worksheet.getRow(1).height = 34;

  worksheet.getCell(2, 1).value = "Período";
  worksheet.getCell(2, 2).value = sanitizeSpreadsheetText(report.period || "Todos los períodos");
  const appliedFilters = report.filters.filter((filter) => Boolean(filter.value));
  worksheet.getCell(3, 1).value = "Filtros";
  worksheet.getCell(3, 2).value = appliedFilters.length
    ? sanitizeSpreadsheetText(appliedFilters.map((filter) => `${filter.label}: ${filter.value}`).join(" · "))
    : "Sin filtros adicionales";
  worksheet.getCell(4, 1).value = "Generado";
  worksheet.getCell(4, 2).value = dateAtReportWallTime(report.generatedAt || new Date());
  worksheet.getCell(4, 2).numFmt = DATE_TIME_FORMAT;
  for (const rowNumber of [2, 3, 4]) {
    worksheet.getCell(rowNumber, 1).font = { bold: true, color: { argb: "FF334155" } };
    worksheet.getCell(rowNumber, 2).alignment = { vertical: "top", wrapText: true };
  }
  worksheet.getRow(3).height = appliedFilters.length ? 34 : 20;
  worksheet.getRow(5).height = 8;

  const headerRow = worksheet.getRow(HEADER_ROW);
  sheet.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0878D1" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  headerRow.height = 28;

  for (const row of sheet.rows) {
    const cells = sheet.columns.map((column) => toExcelCellValue(row[column.key], column.kind));
    const worksheetRow = worksheet.addRow(cells);
    let wrappedLines = 1;
    worksheetRow.eachCell((cell, index) => {
      const column = sheet.columns[index - 1];
      cell.alignment = { vertical: "top", horizontal: column?.kind === "number" || column?.kind === "currency" ? "right" : "left", wrapText: Boolean(column?.wrapText) };
      if (column?.kind === "date") cell.numFmt = DATE_TIME_FORMAT;
      if (column?.kind === "dateOnly") cell.numFmt = DATE_FORMAT;
      if (column?.kind === "number") cell.numFmt = NUMBER_FORMAT;
      if (column?.kind === "currency") cell.numFmt = CURRENCY_FORMAT;
      if (typeof cell.value === "string" && column?.wrapText) {
        const width = column.width || Math.min(34, column.header.length + 5);
        const visualLines = cell.value.split(/\r?\n/).reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(width, 12))), 0);
        wrappedLines = Math.max(wrappedLines, visualLines);
      }
    });
    if (wrappedLines > 1) worksheetRow.height = Math.min(409, 18 * wrappedLines);
  }

  if (!sheet.rows.length && sheet.columns.length) {
    worksheet.mergeCells(HEADER_ROW + 1, 1, HEADER_ROW + 1, columnCount);
    const empty = worksheet.getCell(HEADER_ROW + 1, 1);
    empty.value = "No hay datos para los filtros seleccionados.";
    empty.font = { italic: true, color: { argb: "FF64748B" } };
    empty.alignment = { wrapText: true, vertical: "middle" };
    worksheet.getRow(HEADER_ROW + 1).height = 26;
  }

  if (sheet.columns.length) {
    worksheet.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: sheet.columns.length }
    };
  }
  worksheet.views = [{ state: "frozen", ySplit: HEADER_ROW }];
  worksheet.properties.defaultRowHeight = 20;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > HEADER_ROW) row.eachCell((cell) => { cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } }; });
  });
  return worksheet;
}

export async function createOpsReportXlsx(report: OpsXlsxReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Opturon";
  workbook.subject = report.title;
  workbook.created = report.generatedAt || new Date();
  workbook.modified = report.generatedAt || new Date();
  styleReportSheet(workbook, { name: "Datos", columns: report.columns, rows: report.rows }, report);
  for (const sheet of report.additionalSheets || []) styleReportSheet(workbook, sheet, report);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
