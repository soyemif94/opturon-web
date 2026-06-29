"use client";

import { useMemo, useState, type OptionHTMLAttributes, type SelectHTMLAttributes } from "react";
import { AlertTriangle, Download, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import type { PortalCatalogImport } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const STEP_LABELS = ["Archivo", "Hoja y formato", "Mapeo", "Vista previa", "Confirmación", "Resultado"] as const;
const GUIDED_STAGE_LABELS = ["Subir archivo", "Revisar productos", "Confirmar importación"] as const;
const IMPORT_FIELDS = [
  { value: "", label: "No importar" },
  { value: "name", label: "Nombre" },
  { value: "description", label: "Descripción" },
  { value: "categoryName", label: "Categoría" },
  { value: "brand", label: "Marca" },
  { value: "price", label: "Precio" },
  { value: "stock", label: "Stock" },
  { value: "sku", label: "SKU" },
  { value: "active", label: "Activo" },
  { value: "currency", label: "Moneda" },
  { value: "imageUrl", label: "Imagen URL" }
];
const SELECT_CLASS_NAME =
  "h-11 w-full rounded-2xl border border-white/10 bg-slate-950/95 px-3 text-sm text-slate-100 shadow-inner shadow-black/20 outline-none transition disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-slate-900/70 disabled:text-slate-500 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/25 [color-scheme:dark] [&>option]:bg-slate-950 [&>option]:text-slate-100";
const SELECT_OPTION_CLASS_NAME = "bg-slate-950 text-slate-100";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  disabled?: boolean;
  onImported?: () => Promise<void> | void;
};

export function CatalogImportWizard({ disabled = false, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [hasHeaders, setHasHeaders] = useState(true);
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "update" | "cancel">("skip");
  const [categoryPolicy, setCategoryPolicy] = useState<"reject_missing" | "create_missing">("create_missing");
  const [importPolicy, setImportPolicy] = useState<"valid_only" | "fail_on_error">("valid_only");
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [importSession, setImportSession] = useState<PortalCatalogImport | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [showCategoryPolicyOptions, setShowCategoryPolicyOptions] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "success" | "warning"; text: string } | null>(null);

  const columns = importSession?.analysis?.columns || [];
  const previewRows = importSession?.analysis?.previewRows || [];
  const stats = importSession?.analysis?.stats;
  const resultSummary = importSession?.result?.summary;
  const resultRows = importSession?.result?.rows || [];
  const sheetOptions = importSession?.config?.sheets || [];
  const mappedColumns = columns.filter((column) => mapping[column.key]);
  const reviewColumns = columns.filter((column) => !mapping[column.key]);
  const columnExamples = mappedColumns.slice(0, 4);
  const guidedStage = getGuidedStage(step);
  const readyRowsLabel = stats?.errorRows
    ? `${stats.validRows || 0} listos y ${stats.errorRows || 0} con problemas`
    : `${stats?.totalRows || previewRows.length || 0} productos encontrados`;
  const previewStatusCount = useMemo(() => {
    return previewRows.reduce(
      (accumulator, row) => {
        accumulator[row.status] = (accumulator[row.status] || 0) + 1;
        return accumulator;
      },
      {} as Record<string, number>
    );
  }, [previewRows]);

  function resetState() {
    setStep(1);
    setFile(null);
    setSheetName("");
    setDelimiter("");
    setHasHeaders(true);
    setDuplicatePolicy("skip");
    setCategoryPolicy("create_missing");
    setImportPolicy("valid_only");
    setMapping({});
    setImportSession(null);
    setShowAdvancedOptions(false);
    setShowColumnMapping(false);
    setShowCategoryPolicyOptions(false);
    setAnalyzing(false);
    setConfirming(false);
    setMessage(null);
  }

  function closeModal(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  }

  function updateMapping(columnKey: string, value: string) {
    setMapping((current) => {
      const next = { ...current };
      const normalized = value || null;
      Object.keys(next).forEach((key) => {
        if (key !== columnKey && next[key] === normalized && normalized) {
          next[key] = null;
        }
      });
      next[columnKey] = normalized;
      return next;
    });
  }

  async function runAnalyze(
    targetStep: Step = 4,
    overrides?: Partial<{
      duplicatePolicy: "skip" | "update" | "cancel";
      categoryPolicy: "reject_missing" | "create_missing";
      importPolicy: "valid_only" | "fail_on_error";
    }>
  ) {
    if (!file) {
      setMessage({ tone: "warning", text: "Selecciona un archivo antes de analizar." });
      setStep(1);
      return;
    }

    const formData = new FormData();
    const nextDuplicatePolicy = overrides?.duplicatePolicy || duplicatePolicy;
    const nextCategoryPolicy = overrides?.categoryPolicy || categoryPolicy;
    const nextImportPolicy = overrides?.importPolicy || importPolicy;
    formData.append("file", file);
    formData.append("hasHeaders", String(hasHeaders));
    formData.append("duplicatePolicy", nextDuplicatePolicy);
    formData.append("categoryPolicy", nextCategoryPolicy);
    formData.append("importPolicy", nextImportPolicy);
    if (sheetName) formData.append("sheetName", sheetName);
    if (delimiter) formData.append("delimiter", delimiter);
    formData.append("mapping", JSON.stringify(mapping));

    setAnalyzing(true);
    setMessage({ tone: "info", text: "Estamos preparando tus productos. Todavía no se guardará nada." });

    try {
      const response = await fetch("/api/app/catalog/imports/analyze", {
        method: "POST",
        body: formData
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No pudimos analizar el archivo."));
      }

      const nextImport = json?.import as PortalCatalogImport;
      setImportSession(nextImport);
      setSheetName(nextImport?.config?.sheetName || "");
      setDelimiter(nextImport?.config?.delimiter || "");
      setHasHeaders(nextImport?.config?.hasHeaders !== false);
      setDuplicatePolicy(nextImport?.config?.duplicatePolicy || nextDuplicatePolicy);
      setCategoryPolicy(nextImport?.config?.categoryPolicy || nextCategoryPolicy);
      setImportPolicy(nextImport?.config?.importPolicy || nextImportPolicy);
      setMapping(nextImport?.analysis?.mapping || {});
      setStep(targetStep);
      const nextStats = nextImport?.analysis?.stats;
      setMessage({
        tone: "info",
        text: nextStats?.errorRows
          ? `✓ Tu archivo está listo: ${nextStats.validRows || 0} productos listos y ${nextStats.errorRows || 0} necesitan revisión.`
          : `✓ Tu archivo está listo: encontramos ${nextStats?.totalRows || 0} productos. Todavía no hicimos ningún cambio.`
      });
    } catch (error) {
      setMessage({
        tone: "warning",
        text: error instanceof Error ? humanizeImportError(error.message) : "No pudimos analizar el archivo."
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCategoryPolicyChange(nextPolicy: "reject_missing" | "create_missing", targetStep: Step = 4) {
    setCategoryPolicy(nextPolicy);
    if (!importSession || !file || nextPolicy === categoryPolicy) {
      return;
    }
    await runAnalyze(targetStep, { categoryPolicy: nextPolicy });
  }

  async function handleConfirm() {
    if (!importSession?.importId) return;
    setConfirming(true);
    try {
      const response = await fetch(`/api/app/catalog/imports/${importSession.importId}/confirm`, {
        method: "POST"
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(json?.error || "No pudimos confirmar la importación."));
      }

      setImportSession(json?.import || null);
      setStep(6);
      setMessage({
        tone: "success",
        text: json?.import?.idempotent
          ? "La importación ya había sido confirmada. Te mostramos el mismo resultado para evitar duplicados."
          : "La importación ya fue confirmada."
      });
      toast.success("Importación confirmada");
      await onImported?.();
    } catch (error) {
      setMessage({
        tone: "warning",
        text: error instanceof Error ? humanizeImportError(error.message) : "No pudimos confirmar la importación."
      });
    } finally {
      setConfirming(false);
    }
  }

  async function downloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const response = await fetch("/api/app/catalog/imports/template", { cache: "no-store" });
      if (!response.ok) throw new Error("No pudimos descargar la plantilla.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "catalog-import-template.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({
        tone: "warning",
        text: error instanceof Error ? error.message : "No pudimos descargar la plantilla."
      });
    } finally {
      setDownloadingTemplate(false);
    }
  }

  function downloadErrors() {
    if (!importSession?.importId) return;
    window.open(`/api/app/catalog/imports/${importSession.importId}/errors`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Importar productos
      </Button>

      <Dialog open={open} onOpenChange={closeModal}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-[28px] border-white/10 bg-[linear-gradient(180deg,rgba(15,24,38,0.98),rgba(8,14,24,0.98))] p-0">
          <div className="border-b border-white/10 px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Importar productos</DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                Subí tu archivo y Opturon preparará los productos por vos. Nada se guardará hasta que confirmes.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {GUIDED_STAGE_LABELS.map((label, index) => {
                const stageNumber = index + 1;
                const active = guidedStage === stageNumber;
                const enabled =
                  stageNumber === 1 ||
                  (stageNumber === 2 && importSession) ||
                  (stageNumber === 3 && importSession);
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!enabled}
                    onClick={() => enabled && setStep(stageNumber === 1 ? (file ? 2 : 1) : stageNumber === 2 ? 4 : 5)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                      active
                        ? "border-amber-400/40 bg-amber-400/12 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-300"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Etapa {stageNumber}</p>
                    <p className="mt-1 text-sm font-medium">{label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            {message ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <Badge variant={message.tone === "success" ? "success" : message.tone === "warning" ? "warning" : "muted"}>
                  {message.text}
                </Badge>
              </div>
            ) : null}

            {step === 1 ? (
              <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">1. Seleccionar archivo</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Admitimos `.xlsx`, `.csv` y `.txt` delimitado. Límite inicial: hasta 10 MB, 10.000 filas y 100 columnas.
                  </p>
                  <label className="mt-5 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(245,158,11,0.06))] px-6 text-center">
                    <FileSpreadsheet className="h-10 w-10 text-amber-300" />
                    <span className="mt-4 text-base font-medium text-white">
                      {file ? file.name : "Haz clic para elegir el archivo"}
                    </span>
                    <span className="mt-2 text-sm text-slate-300">
                      Si vuelves a analizar, reutilizamos este mismo archivo local y seguimos sin tocar el catálogo.
                    </span>
                    <Input
                      type="file"
                      accept=".xlsx,.csv,.txt"
                      className="hidden"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] || null;
                        setFile(nextFile);
                        setImportSession(null);
                        setMapping({});
                        setMessage(null);
                        if (nextFile) setStep(2);
                      }}
                    />
                  </label>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">Plantilla recomendada</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Descarga una base compatible con encabezados sugeridos. Las dos filas de ejemplo están marcadas para borrarlas antes de volver a subir la plantilla.
                  </p>
                  <Button type="button" variant="secondary" className="mt-5 w-full rounded-2xl" onClick={downloadTemplate} disabled={downloadingTemplate}>
                    {downloadingTemplate ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Descargar plantilla
                  </Button>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">Archivo seleccionado</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Opturon usará la configuración recomendada. Si tu archivo tiene algo especial, podés abrir las opciones avanzadas.
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-200">
                      {file?.name || "Sin archivo"}
                    </div>

                    <CategoryRecommendationCard
                      value={categoryPolicy}
                      expanded={showCategoryPolicyOptions}
                      onToggle={() => setShowCategoryPolicyOptions((current) => !current)}
                      onChange={setCategoryPolicy}
                    />

                    <AdvancedOptionsShell expanded={showAdvancedOptions} onToggle={() => setShowAdvancedOptions((current) => !current)}>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldBlock label="Primera fila con encabezados">
                          <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-200">
                            <input type="checkbox" checked={hasHeaders} onChange={(event) => setHasHeaders(event.target.checked)} />
                            Detectar encabezados automáticamente
                          </label>
                        </FieldBlock>

                        <FieldBlock label="Hoja (solo Excel)">
                          <DarkSelect value={sheetName} onChange={(event) => setSheetName(event.target.value)}>
                            <DarkOption value="">Primera hoja detectada</DarkOption>
                            {sheetOptions.map((sheet) => (
                              <DarkOption key={sheet.name} value={sheet.name}>
                                {sheet.name} · {sheet.rowCount} filas
                              </DarkOption>
                            ))}
                          </DarkSelect>
                        </FieldBlock>

                        <FieldBlock label="Delimitador (CSV/TXT)">
                          <DarkSelect value={delimiter} onChange={(event) => setDelimiter(event.target.value)}>
                            <DarkOption value="">Detectar automáticamente</DarkOption>
                            <DarkOption value=";">Punto y coma (;)</DarkOption>
                            <DarkOption value=",">Coma (,)</DarkOption>
                            <DarkOption value={"	"}>Tabulación</DarkOption>
                            <DarkOption value="|">Barra vertical (|)</DarkOption>
                          </DarkSelect>
                        </FieldBlock>
                      </div>
                    </AdvancedOptionsShell>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(255,255,255,0.03))] p-5">
                  <p className="text-sm font-semibold text-white">Todo listo para preparar</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">Vamos a detectar columnas, productos y posibles problemas. Todavía no se guarda nada.</p>
                  <Button type="button" className="mt-6 w-full rounded-2xl" onClick={() => void runAnalyze(3)} disabled={!file || analyzing}>
                    {analyzing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Preparar productos
                  </Button>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Columnas del archivo</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Opturon reconoció lo importante. Revisá sólo lo que necesite atención.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" className="rounded-2xl" onClick={() => void runAnalyze(4)} disabled={analyzing}>
                    {analyzing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Revisar productos
                  </Button>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-300/10 p-4">
                    <Badge variant={reviewColumns.length ? "warning" : "success"}>
                      {reviewColumns.length ? "Hay columnas para revisar" : "Todo fue reconocido correctamente"}
                    </Badge>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <SummaryLine label="Columnas reconocidas" value={String(mappedColumns.length)} />
                      <SummaryLine label="Necesitan revisión" value={String(reviewColumns.length)} />
                    </div>
                    {columnExamples.length ? (
                      <div className="mt-4 grid gap-2 text-sm text-slate-200">
                        {columnExamples.map((column) => (
                          <div key={column.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-3 py-2">
                            <span>{column.label}</span>
                            <span className="font-medium text-white">→ {labelForImportField(mapping[column.key])}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className={`rounded-[24px] border p-4 ${reviewColumns.length ? "border-amber-300/25 bg-amber-300/10" : "border-white/10 bg-black/10"}`}>
                    {reviewColumns.length ? (
                      <>
                        <Badge variant="warning">Necesitamos revisar {reviewColumns.length} columna(s)</Badge>
                        <div className="mt-3 space-y-2 text-sm text-amber-100">
                          {reviewColumns.slice(0, 3).map((column) => (
                            <p key={column.key}>“{column.label}” todavía no tiene un destino.</p>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <Badge variant="success">Sin problemas</Badge>
                        <p className="mt-3 text-sm leading-6 text-slate-300">Podés continuar sin revisar columnas manualmente.</p>
                      </>
                    )}
                    <Button type="button" variant="secondary" className="mt-4 w-full rounded-2xl" onClick={() => setShowColumnMapping((current) => !current)}>
                      {showColumnMapping ? "Ocultar columnas" : "Revisar columnas"}
                    </Button>
                  </div>
                </div>

                {showColumnMapping || reviewColumns.length ? <div className="mt-5 space-y-3">
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_0.95fr] ${
                        mapping[column.key] ? "border-white/10 bg-black/10" : "border-amber-300/25 bg-amber-300/10"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{column.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">Columna {column.index + 1}</p>
                      </div>
                      <DarkSelect value={mapping[column.key] || ""} onChange={(event) => updateMapping(column.key, event.target.value)}>
                        {IMPORT_FIELDS.map((field) => (
                          <DarkOption key={field.value || "none"} value={field.value}>
                            {field.label}
                          </DarkOption>
                        ))}
                      </DarkSelect>
                    </div>
                  ))}
                </div> : null}
              </section>
            ) : null}

            {step === 4 ? (
              <section className="space-y-5">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-4 rounded-[24px] border border-emerald-300/20 bg-emerald-300/10 p-4">
                    <Badge variant="success">✓ Tu archivo está listo</Badge>
                    <p className="mt-3 text-2xl font-semibold text-white">{readyRowsLabel}</p>
                    <p className="mt-1 text-sm text-slate-300">Todavía no hicimos ningún cambio.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">{stats?.totalRows || 0} filas detectadas</Badge>
                    <Badge variant="success">{stats?.validRows || 0} válidas</Badge>
                    <Badge variant={stats?.warningRows ? "warning" : "muted"}>{stats?.warningRows || 0} con advertencias</Badge>
                    <Badge variant={stats?.errorRows ? "danger" : "muted"}>{stats?.errorRows || 0} con errores</Badge>
                    <Badge variant={stats?.duplicateRows ? "warning" : "muted"}>{stats?.duplicateRows || 0} duplicadas</Badge>
                    <Badge variant={stats?.newCategories ? "warning" : "muted"}>Categorías nuevas: {stats?.newCategories || 0}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Mostramos primero los productos que necesitan revisión. La configuración recomendada ya está aplicada.
                  </p>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-300">
                      Si cambias esta polÃ­tica, recalculamos la vista previa con el mismo archivo antes de confirmar.
                    </div>
                    <FieldBlock label="CategorÃ­as faltantes">
                      <DarkSelect
                        value={categoryPolicy}
                        disabled={analyzing}
                        onChange={(event) => void handleCategoryPolicyChange(event.target.value as "reject_missing" | "create_missing", 4)}
                      >
                        <DarkOption value="reject_missing">No crear y marcar error</DarkOption>
                        <DarkOption value="create_missing">Crear categorÃ­as faltantes</DarkOption>
                      </DarkSelect>
                    </FieldBlock>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm font-semibold text-white">Productos revisados</p>
                    <div className="mt-4 space-y-3">
                      {previewRows.map((row) => (
                        <div key={`${row.sourceRowNumber}-${row.status}`} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={badgeForPreviewStatus(row.status)}>{labelForPreviewStatus(row.status)}</Badge>
                            <span className="text-sm text-slate-300">Fila {row.sourceRowNumber}</span>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <PreviewValue label="Nombre" value={String(row.values?.name || "Sin nombre")} />
                            <PreviewValue label="SKU" value={String(row.values?.sku || "Sin SKU")} />
                            <PreviewValue label="Precio" value={String(row.values?.price ?? "-")} />
                            <PreviewValue label="Stock" value={String(row.values?.stock ?? "-")} />
                            <PreviewValue label="Categoría" value={String(row.values?.categoryName || "Sin categoría")} />
                            <PreviewValue label="Marca" value={String(row.values?.brand || "-")} />
                            <PreviewValue label="Estado" value={String(row.values?.status || "active")} />
                          </div>
                          {row.values?.categoryPendingCreation ? (
                            <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-sm text-amber-100">
                              <p className="font-medium">Categoría nueva</p>
                              <p className="mt-1 text-amber-100/80">Se creará al confirmar.</p>
                            </div>
                          ) : null}
                          {row.warnings?.length ? <p className="mt-3 text-sm text-amber-200">{row.warnings.join(" ")}</p> : null}
                          {row.errors?.length ? <p className="mt-3 text-sm text-rose-200">{row.errors[0]?.message}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-sm font-semibold text-white">Qué vemos hasta ahora</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <SummaryLine label="Válidas" value={String(previewStatusCount.valid || 0)} />
                      <SummaryLine label="Advertencias" value={String(previewStatusCount.warning || 0)} />
                      <SummaryLine label="Errores" value={String(previewStatusCount.error || 0)} />
                      <SummaryLine label="Duplicadas" value={String(previewStatusCount.duplicated || 0)} />
                      <SummaryLine label="Ignoradas" value={String(previewStatusCount.ignored || 0)} />
                      <SummaryLine label="Categorías nuevas" value={String(stats?.newCategories || 0)} />
                    </div>
                    <Button type="button" variant="secondary" className="mt-5 w-full rounded-2xl" onClick={downloadErrors}>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar errores
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}

            {step === 5 ? (
              <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">5. Confirmación</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Aquí eliges cómo tratar duplicados y categorías faltantes. Si cambias una política, vuelve a analizar para refrescar la vista previa antes de importar.
                  </p>

                  <div className="mt-5 grid gap-4">
                    <FieldBlock label="Duplicados">
                      <DarkSelect value={duplicatePolicy} onChange={(event) => setDuplicatePolicy(event.target.value as "skip" | "update" | "cancel")}>
                        <DarkOption value="skip">Omitir duplicados</DarkOption>
                        <DarkOption value="update">Actualizar productos existentes</DarkOption>
                        <DarkOption value="cancel">Cancelar si hay duplicados</DarkOption>
                      </DarkSelect>
                    </FieldBlock>

                    <FieldBlock label="Categorías faltantes">
                      <DarkSelect
                        value={categoryPolicy}
                        disabled={analyzing}
                        onChange={(event) => void handleCategoryPolicyChange(event.target.value as "reject_missing" | "create_missing", 5)}
                      >
                        <DarkOption value="reject_missing">No crear y marcar error</DarkOption>
                        <DarkOption value="create_missing">Crear categorías faltantes</DarkOption>
                      </DarkSelect>
                    </FieldBlock>

                    <FieldBlock label="Errores de fila">
                      <DarkSelect value={importPolicy} onChange={(event) => setImportPolicy(event.target.value as "valid_only" | "fail_on_error")}>
                        <DarkOption value="valid_only">Importar solo filas válidas</DarkOption>
                        <DarkOption value="fail_on_error">Cancelar toda la importación si hay errores</DarkOption>
                      </DarkSelect>
                    </FieldBlock>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(245,158,11,0.08),rgba(255,255,255,0.03))] p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
                    <div>
                      <p className="text-sm font-semibold text-white">Checklist antes de confirmar</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {stats?.errorRows
                          ? `Hay ${stats.errorRows} fila(s) con error. Si sigues con “Importar solo filas válidas”, esas filas no entrarán.`
                          : "No detectamos errores bloqueantes en la vista previa actual."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-200">
                    Categorías faltantes: <span className="font-semibold text-white">{labelForCategoryPolicy(categoryPolicy)}</span>
                  </div>

                  <Button type="button" variant="secondary" className="mt-5 w-full rounded-2xl" onClick={() => void runAnalyze(5)} disabled={analyzing}>
                    {analyzing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Reanalizar con estas políticas
                  </Button>
                  <Button type="button" className="mt-3 w-full rounded-2xl" onClick={() => void handleConfirm()} disabled={confirming || analyzing}>
                    {confirming ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Confirmar importación
                  </Button>
                </div>
              </section>
            ) : null}

            {step === 6 ? (
              <section className="space-y-5">
                <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <Badge variant="success">Resultado final</Badge>
                  <p className="mt-3 text-sm leading-6 text-slate-100">La importación ya fue confirmada. Si reintentas la confirmación, devolvemos el mismo resultado para evitar duplicados.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ResultCard label="Productos creados" value={String(resultSummary?.created || 0)} />
                  <ResultCard label="Productos actualizados" value={String(resultSummary?.updated || 0)} />
                  <ResultCard label="Duplicados omitidos" value={String(resultSummary?.skippedDuplicates || 0)} />
                  <ResultCard label="Filas con error" value={String(resultSummary?.errors || 0)} />
                  <ResultCard label="Categorías creadas" value={String(resultSummary?.createdCategories || 0)} />
                  <ResultCard label="Tiempo" value={formatProcessingTime(resultSummary?.processingTimeMs || 0)} />
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">Detalle del lote</p>
                  <div className="mt-4 space-y-2">
                    {resultRows.slice(0, 20).map((row) => (
                      <div key={`${row.sourceRowNumber}-${row.status}-${row.productId || row.code || "row"}`} className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                        <Badge variant={row.status === "created" || row.status === "updated" ? "success" : row.status === "skipped" ? "warning" : "danger"}>
                          Fila {row.sourceRowNumber}
                        </Badge>
                        <span>{humanizeResultRow(row)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <DialogFooter className="sticky bottom-0 z-20 border-t border-white/10 bg-slate-950/95 px-6 py-4 backdrop-blur">
            {step > 1 && step < 6 ? (
              <Button type="button" variant="secondary" onClick={() => setStep((Math.max(1, step - 1) as Step))}>
                Volver
              </Button>
            ) : null}
            {step === 6 ? (
              <Button type="button" variant="secondary" onClick={downloadErrors}>
                <Download className="mr-2 h-4 w-4" />
                Descargar errores
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => closeModal(false)}>
              {step === 6 ? "Cerrar" : "Cancelar"}
            </Button>
            {step === 3 ? (
              <Button type="button" onClick={() => void runAnalyze(4)} disabled={analyzing}>
                {analyzing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                {stats?.errorRows ? `Revisar ${stats.errorRows} productos con problemas` : `Revisar ${stats?.totalRows || previewRows.length || "los"} productos`}
              </Button>
            ) : null}
            {step === 4 ? (
              <Button type="button" onClick={() => setStep(5)}>
                Continuar con {stats?.validRows || 0} productos
              </Button>
            ) : null}
            {step === 6 ? (
              <Button type="button" onClick={() => closeModal(false)}>
                Importar otro archivo
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      {children}
    </div>
  );
}

function DarkSelect({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${SELECT_CLASS_NAME} ${className}`.trim()}>
      {children}
    </select>
  );
}

function DarkOption({ children, ...props }: OptionHTMLAttributes<HTMLOptionElement>) {
  return (
    <option {...props} className={`${SELECT_OPTION_CLASS_NAME} ${props.className || ""}`.trim()}>
      {children}
    </option>
  );
}

function AdvancedOptionsShell({
  expanded,
  onToggle,
  children
}: {
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-amber-300/30"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        Opciones avanzadas
        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{expanded ? "Ocultar" : "Mostrar"}</span>
      </button>
      {expanded ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

function CategoryRecommendationCard({
  value,
  expanded,
  onToggle,
  onChange
}: {
  value: "reject_missing" | "create_missing";
  expanded: boolean;
  onToggle: () => void;
  onChange: (value: "reject_missing" | "create_missing") => void;
}) {
  return (
    <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-300/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-100">Categorías nuevas</p>
          <Badge variant="success" className="mt-3">✓ Recomendado</Badge>
          <p className="mt-3 text-base font-semibold text-white">Crear las categorías automáticamente</p>
          <p className="mt-1 text-sm text-emerald-50/80">Las crearemos recién cuando confirmes.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="rounded-2xl" onClick={onToggle} aria-expanded={expanded}>
          Cambiar configuración
        </Button>
      </div>
      {expanded ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <CategoryPolicyOption
            checked={value === "create_missing"}
            disabled={false}
            label="Crear categorías automáticamente"
            description="Recomendado para importar productos nuevos sin detenerte."
            onChange={() => onChange("create_missing")}
          />
          <CategoryPolicyOption
            checked={value === "reject_missing"}
            disabled={false}
            label="No crear categorías nuevas"
            description="Los productos con categorías nuevas quedarán para revisar."
            onChange={() => onChange("reject_missing")}
          />
        </div>
      ) : null}
    </div>
  );
}

function CategoryPolicyPanel({
  value,
  disabled = false,
  onChange
}: {
  value: "reject_missing" | "create_missing";
  disabled?: boolean;
  onChange: (value: "reject_missing" | "create_missing") => void;
}) {
  return (
    <fieldset className="rounded-[24px] border border-white/10 bg-black/10 p-4">
      <legend className="px-1 text-xs uppercase tracking-[0.18em] text-slate-400">Categorías inexistentes</legend>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <CategoryPolicyOption
          checked={value === "reject_missing"}
          disabled={disabled}
          label="Marcarlas como error"
          description="Mantiene el control conservador: ninguna categoría nueva entra sin corregir el archivo."
          onChange={() => onChange("reject_missing")}
        />
        <CategoryPolicyOption
          checked={value === "create_missing"}
          disabled={disabled}
          label="Crearlas al confirmar"
          description="La categoría se mostrará en la vista previa, pero recién se creará cuando confirmes la importación."
          onChange={() => onChange("create_missing")}
        />
      </div>
    </fieldset>
  );
}

function CategoryPolicyOption({
  checked,
  disabled,
  label,
  description,
  onChange
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
        checked ? "border-amber-300/40 bg-amber-300/10 text-white" : "border-white/10 bg-slate-950/70 text-slate-200"
      } ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-amber-300/30"}`}
    >
      <input type="radio" checked={checked} disabled={disabled} onChange={onChange} className="mt-1 accent-amber-300" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-300">{description}</span>
      </span>
    </label>
  );
}

function PreviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-100">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
      <span>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function badgeForPreviewStatus(status: string) {
  if (status === "valid") return "success";
  if (status === "warning" || status === "duplicated") return "warning";
  if (status === "ignored") return "muted";
  return "danger";
}

function getGuidedStage(step: Step) {
  if (step <= 2) return 1;
  if (step <= 4) return 2;
  return 3;
}

function labelForImportField(value: string | null | undefined) {
  return IMPORT_FIELDS.find((field) => field.value === value)?.label || "No importar";
}

function labelForPreviewStatus(status: string) {
  if (status === "valid") return "Válida";
  if (status === "warning") return "Con advertencias";
  if (status === "duplicated") return "Duplicada";
  if (status === "ignored") return "Ignorada";
  return "Con errores";
}

function labelForCategoryPolicy(policy: "reject_missing" | "create_missing") {
  return policy === "create_missing" ? "Crear al confirmar" : "Marcarlas como error";
}

function humanizeImportError(code: string) {
  switch (code) {
    case "unsupported_catalog_import_file_type":
      return "Ese formato no está habilitado. Usa XLSX, CSV o TXT delimitado.";
    case "catalog_import_file_too_large":
      return "El archivo supera el tamaño máximo permitido para esta primera fase.";
    case "catalog_import_unstructured_text":
      return "No pudimos detectar columnas en este archivo. Probá con CSV, Excel o un TXT delimitado.";
    case "catalog_import_too_many_rows":
      return "El archivo supera el máximo de filas permitido.";
    case "catalog_import_too_many_columns":
      return "El archivo tiene demasiadas columnas para esta fase.";
    case "catalog_import_blocked_by_errors":
      return "La política actual cancela toda la importación cuando existen errores.";
    case "catalog_import_cancelled":
      return "Esta importación ya fue cancelada.";
    default:
      return code;
  }
}

function humanizeResultRow(row: { status: string; productId?: string; code?: string; message?: string }) {
  if (row.status === "created") return `Producto creado${row.productId ? ` (${row.productId})` : ""}.`;
  if (row.status === "updated") return `Producto actualizado${row.productId ? ` (${row.productId})` : ""}.`;
  if (row.status === "skipped") return row.code === "duplicate_existing" ? "Duplicado omitido." : "Fila omitida.";
  return row.message || row.code || "Fila con error.";
}

function formatProcessingTime(value: number) {
  if (!value) return "0 s";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}
