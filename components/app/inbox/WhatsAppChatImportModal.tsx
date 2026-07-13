"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Upload, X } from "lucide-react";
import { toast } from "@/components/ui/toast";

type ImportPreview = {
  importId: string;
  totalMessages: number;
  newEstimated: number;
  duplicateEstimated: number;
  ignoredLines: number;
  participants: string[];
  dateRange?: { from?: string | null; to?: string | null };
  detectedFormat: string;
  warnings: Array<{ code?: string; message?: string } | string>;
  conversationId?: string | null;
  insertedMessages?: number;
  duplicateMessages?: number;
};

type ContactOption = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Sin dato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin dato";
  return date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function warningLabel(value: { code?: string; message?: string } | string) {
  if (typeof value === "string") return value;
  return value.message || value.code || "Advertencia";
}

export function WhatsAppChatImportModal({ onImported }: { onImported?: (conversationId?: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileValid = useMemo(() => Boolean(file && file.name.toLowerCase().endsWith(".txt")), [file]);
  const canConfirm = Boolean(preview?.importId && !confirming);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/app/contacts", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (cancelled || !response.ok) return;
      setContacts(Array.isArray(json?.contacts) ? json.contacts : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function resetState() {
    setFile(null);
    setPreview(null);
    setSelectedContactId("");
    setError(null);
  }

  async function runPreview() {
    if (!file || !fileValid || previewing) return;
    setPreviewing(true);
    setError(null);
    setPreview(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/app/whatsapp/imports/preview", {
        method: "POST",
        body: formData
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "whatsapp_import_preview_failed"));
      setPreview(json.import as ImportPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo previsualizar el archivo.");
    } finally {
      setPreviewing(false);
    }
  }

  async function confirmImport() {
    if (!preview?.importId || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/whatsapp/imports/${encodeURIComponent(preview.importId)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedContactId: selectedContactId || null })
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(json?.error || "whatsapp_import_confirm_failed"));
      const imported = json.import as ImportPreview;
      setPreview(imported);
      toast.success("Historial importado", "Los mensajes se agregaron como historial local.");
      onImported?.(imported.conversationId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el historial.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-muted transition hover:text-text"
      >
        <Upload className="h-3.5 w-3.5" />
        Importar historial de WhatsApp
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[color:var(--border)] bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Importar historial de WhatsApp</h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Esta importación sólo agrega historial. No envía mensajes ni activa el bot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetState();
                }}
                className="rounded-full border border-[color:var(--border)] p-2 text-muted hover:text-text"
                aria-label="Cerrar importador"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block rounded-[18px] border border-dashed border-[color:var(--border)] bg-card/45 p-4">
                <span className="text-xs font-medium text-text">Archivo exportado .txt</span>
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="mt-3 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] || null);
                    setPreview(null);
                    setError(null);
                  }}
                />
                {file && !fileValid ? <p className="mt-2 text-xs text-red-200">El archivo debe ser .txt.</p> : null}
              </label>

              <button
                type="button"
                onClick={() => void runPreview()}
                disabled={!fileValid || previewing}
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {previewing ? "Analizando..." : "Previsualizar"}
              </button>

              {error ? (
                <div className="rounded-[18px] border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              {preview ? (
                <div className="space-y-3 rounded-[20px] border border-[color:var(--border)] bg-card/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Summary label="Mensajes detectados" value={String(preview.totalMessages)} />
                    <Summary label="Nuevos estimados" value={String(preview.newEstimated)} />
                    <Summary label="Duplicados estimados" value={String(preview.duplicateEstimated)} />
                    <Summary label="Lineas ignoradas" value={String(preview.ignoredLines)} />
                    <Summary label="Formato" value={preview.detectedFormat || "unknown"} />
                    <Summary label="Rango" value={`${formatDate(preview.dateRange?.from)} - ${formatDate(preview.dateRange?.to)}`} />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-text">Participantes</p>
                    <p className="mt-1 text-sm text-muted">{preview.participants?.length ? preview.participants.join(", ") : "Sin participantes detectados"}</p>
                  </div>

                  {preview.warnings?.length ? (
                    <div className="rounded-[16px] border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                      {preview.warnings.map((warning, index) => (
                        <p key={`${warningLabel(warning)}-${index}`}>{warningLabel(warning)}</p>
                      ))}
                    </div>
                  ) : null}

                  <label className="block">
                    <span className="text-xs font-medium text-text">Contacto destino opcional</span>
                    <select
                      value={selectedContactId}
                      onChange={(event) => setSelectedContactId(event.target.value)}
                      className="mt-2 w-full rounded-[14px] border border-[color:var(--border)] bg-surface px-3 py-2 text-sm text-text"
                    >
                      <option value="">Crear contacto importado para revisar telefono</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name || contact.phone || contact.email || contact.id}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void confirmImport()}
                      disabled={!canConfirm}
                      className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {confirming ? "Importando..." : "Importar historial"}
                    </button>
                    {preview.conversationId ? (
                      <Link
                        href={`/app/inbox/${preview.conversationId}`}
                        className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-muted hover:text-text"
                      >
                        Abrir conversacion
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[color:var(--border)] bg-surface/70 px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-text">{value}</p>
    </div>
  );
}
