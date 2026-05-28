"use client";

import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Building2,
  CalendarClock,
  FileBadge2,
  ImageIcon,
  Landmark,
  MapPinned,
  ShieldCheck,
  Truck,
  Upload,
  UserCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type Settings = {
  tenantId?: string;
  profileImageUrl?: string;
  legalName?: string;
  taxId?: string;
  taxIdType?: string;
  vatCondition?: string;
  grossIncomeNumber?: string;
  fiscalAddress?: string;
  city?: string;
  province?: string;
  pointOfSaleSuggested?: string;
  defaultSuggestedFiscalVoucherType?: string;
  accountantEmail?: string;
  accountantName?: string;
  openingHours?: string;
  address?: string;
  deliveryZones?: string;
  paymentMethods?: string;
  policies?: string;
};

const TAX_ID_TYPES = ["NONE", "DNI", "CUIT", "CUIL"] as const;
const VOUCHER_TYPES = ["NONE", "A", "B", "C"] as const;
export const BUSINESS_SETTINGS_FORM_ID = "business-settings-form";

export function BusinessSettingsForm({
  initialSettings,
  tenantName,
  tenantIndustry
}: {
  initialSettings: Settings;
  tenantName?: string;
  tenantIndustry?: string;
}) {
  const [form, setForm] = useState<Settings>(initialSettings || {});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | null; text: string }>({
    tone: null,
    text: ""
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const completion = useMemo(() => {
    const values = [
      form.legalName,
      form.profileImageUrl,
      form.openingHours,
      form.address,
      form.deliveryZones,
      form.paymentMethods,
      form.taxId,
      form.vatCondition,
      form.fiscalAddress,
      form.accountantName,
      form.accountantEmail
    ];
    const completed = values.filter((value) => String(value || "").trim().length > 0 && value !== "NONE").length;
    return { total: values.length, completed, progress: Math.round((completed / values.length) * 100) };
  }, [form]);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.set("file", file, file.name || "business-image");

      const response = await fetch("/api/app/catalog/image-upload", {
        method: "POST",
        body: formData
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.image?.url) {
        throw new Error(String(json?.error || "No se pudo subir la imagen del negocio."));
      }

      setForm((current) => ({
        ...current,
        profileImageUrl: String(json.image.url || "")
      }));
      toast.success("Imagen actualizada", "La imagen del negocio ya quedo lista en la configuracion.");
    } catch (error) {
      toast.error("No se pudo subir la imagen", error instanceof Error ? error.message : "unknown_error");
    } finally {
      setUploadingImage(false);
    }
  }

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSaving(true);
    setFeedback({ tone: null, text: "" });
    try {
      const response = await fetch("/api/app/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await safeJson(response);
      if (!response.ok) {
        const message = json?.error?.formErrors?.[0] || json?.detail || json?.error || "No se pudieron guardar los datos del negocio.";
        setFeedback({ tone: "error", text: String(message) });
        toast.error("Error al guardar", String(message));
        return;
      }
      setForm(json?.settings || form);
      setFeedback({ tone: "success", text: "Cuenta y negocio guardado correctamente." });
      toast.success("Negocio actualizado");
    } catch {
      setFeedback({ tone: "error", text: "Ocurrio un error de red. Reintenta en unos segundos." });
      toast.error("Error de red", "No pudimos guardar los datos del negocio.");
    } finally {
      setIsSaving(false);
    }
  }

  const businessImage = String(form.profileImageUrl || "").trim();

  return (
    <form id={BUSINESS_SETTINGS_FORM_ID} className="space-y-5" onSubmit={save}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.96))] p-1.5">
          <TabsTrigger value="general" className="rounded-[16px] px-4 py-2.5 text-sm">
            Informacion general
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="rounded-[16px] px-4 py-2.5 text-sm">
            Informacion fiscal
          </TabsTrigger>
          <TabsTrigger value="accountant" className="rounded-[16px] px-4 py-2.5 text-sm">
            Contacto contador
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-5">
          <BusinessSection
            icon={<Building2 className="h-5 w-5" />}
            title="Identidad del negocio"
            helper="Informacion basica que identifica tu negocio dentro de Opturon y le da contexto al bot."
            tone="brand"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Nombre del negocio"
                    value={form.legalName || ""}
                    onChange={(value) => setForm((current) => ({ ...current, legalName: value }))}
                    placeholder="Ej. Opturon Demo"
                  />
                  <InfoTile
                    label="Operacion actual"
                    value={tenantIndustry || "Operacion comercial"}
                    helper="Lectura visual del espacio actual dentro de Opturon."
                  />
                </div>

                <div className="rounded-[22px] border border-white/8 bg-surface/55 p-4">
                  <p className="text-sm font-medium text-white">Imagen del negocio</p>
                  <p className="mt-1 text-sm leading-6 text-muted">Subi el logo o imagen principal que representa a tu negocio dentro del portal.</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-[132px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(176,80,0,0.18),rgba(255,255,255,0.05))]">
                      {businessImage ? (
                        <img src={businessImage} alt={form.legalName || tenantName || "Negocio"} className="aspect-square h-full w-full object-cover" />
                      ) : (
                        <div className="flex aspect-square items-center justify-center text-3xl font-semibold text-brandBright">
                          {String(form.legalName || tenantName || "N").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-[20px] border border-dashed border-white/12 bg-black/16 p-4">
                        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleImageUpload(event)} />
                        <Button type="button" variant="secondary" className="w-full rounded-2xl" onClick={() => fileInputRef.current?.click()} disabled={isSaving || uploadingImage}>
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadingImage ? "Subiendo imagen..." : "Subir imagen"}
                        </Button>
                        <p className="mt-3 text-sm leading-6 text-muted">PNG, JPG o WebP. Si ya tenes una URL externa, podes usarla como respaldo abajo.</p>
                      </div>
                      <Field
                        label="URL alternativa de la imagen"
                        value={form.profileImageUrl || ""}
                        onChange={(value) => setForm((current) => ({ ...current, profileImageUrl: value }))}
                        placeholder="https://..."
                      />
                      {businessImage ? (
                        <Button type="button" variant="ghost" className="rounded-2xl px-0 text-muted hover:text-white" onClick={() => setForm((current) => ({ ...current, profileImageUrl: "" }))} disabled={isSaving || uploadingImage}>
                          Quitar imagen
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.98),rgba(8,14,23,0.96))] p-5 shadow-[var(--card-shadow)]">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brandBright">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-white">Vista previa del negocio</p>
                    <p className="mt-1 text-sm leading-6 text-muted">Asi se ve la identidad principal que usa el portal para representar tu espacio.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(176,80,0,0.24),transparent_36%),linear-gradient(135deg,rgba(17,24,36,0.98),rgba(10,16,26,0.96))] p-5">
                  <div className="flex items-center gap-4">
                    <div className="overflow-hidden rounded-[22px] border border-white/8 bg-black/20">
                      {businessImage ? (
                        <img src={businessImage} alt={form.legalName || tenantName || "Negocio"} className="h-20 w-20 object-cover" />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center text-2xl font-semibold text-brandBright">
                          {String(form.legalName || tenantName || "N").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <Badge variant="warning">Negocio activo</Badge>
                      <p className="mt-3 text-2xl font-semibold text-white">{form.legalName || tenantName || "Tu negocio"}</p>
                      <p className="mt-1 text-sm text-muted">{tenantIndustry || "Operacion comercial"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </BusinessSection>

          <BusinessSection
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Operacion del negocio"
            helper="Configura como opera tu negocio para que el bot y el equipo respondan con mejor contexto."
            tone="green"
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <Field
                label="Horarios de atencion"
                value={form.openingHours || ""}
                onChange={(value) => setForm((current) => ({ ...current, openingHours: value }))}
                placeholder="Ej. Lun a Vie 9 a 18 hs"
                icon={<CalendarClock className="h-4 w-4" />}
              />
              <Field
                label="Direccion operativa"
                value={form.address || ""}
                onChange={(value) => setForm((current) => ({ ...current, address: value }))}
                placeholder="Ej. Bahia Blanca, Buenos Aires"
                icon={<MapPinned className="h-4 w-4" />}
              />
              <Field
                label="Zonas de entrega o atencion"
                value={form.deliveryZones || ""}
                onChange={(value) => setForm((current) => ({ ...current, deliveryZones: value }))}
                placeholder="Ej. Bahia Blanca, Ingeniero White"
                icon={<Truck className="h-4 w-4" />}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_280px]">
              <Field
                label="Medios de pago aceptados"
                value={form.paymentMethods || ""}
                onChange={(value) => setForm((current) => ({ ...current, paymentMethods: value }))}
                placeholder="Ej. Efectivo, Transferencia, Tarjeta"
                icon={<Banknote className="h-4 w-4" />}
              />
              <InfoTile
                label="Lectura operativa"
                value={form.openingHours?.trim() ? "Operacion visible" : "Pendiente"}
                helper="Estos datos ayudan al bot a dar respuestas mas coherentes sobre horarios y zonas."
              />
            </div>
          </BusinessSection>

          <BusinessSection
            icon={<Truck className="h-5 w-5" />}
            title="Horarios de envio"
            helper="Usa la misma informacion operativa real para definir como informas horarios, zonas y tiempos estimados."
            tone="green"
          >
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_0.9fr]">
              <Field
                label="Horarios de entrega o atencion"
                value={form.openingHours || ""}
                onChange={(value) => setForm((current) => ({ ...current, openingHours: value }))}
                placeholder="Ej. Lun a Sab 9 a 18 hs"
              />
              <Field
                label="Zonas activas"
                value={form.deliveryZones || ""}
                onChange={(value) => setForm((current) => ({ ...current, deliveryZones: value }))}
                placeholder="Ej. Centro, Norte, Ingeniero White"
              />
              <Field
                label="Tiempo o nota estimada"
                value={form.policies || ""}
                onChange={(value) => setForm((current) => ({ ...current, policies: value }))}
                placeholder="Ej. Entrega en 60 a 90 min"
              />
            </div>
            <div className="rounded-[20px] border border-white/8 bg-surface/55 p-4 text-sm leading-6 text-muted">
              Este bloque reutiliza la informacion operativa real disponible hoy para que el bot pueda comunicar mejor horarios, cobertura y condiciones del negocio.
            </div>
          </BusinessSection>
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-5">
          <BusinessSection
            icon={<FileBadge2 className="h-5 w-5" />}
            title="Informacion fiscal"
            helper="Fuente principal del emisor para ordenar la operatoria contable del negocio."
            tone="brand"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Razon social"
                value={form.legalName || ""}
                onChange={(value) => setForm((current) => ({ ...current, legalName: value }))}
              />
              <Field label="CUIT / DNI" value={form.taxId || ""} onChange={(value) => setForm((current) => ({ ...current, taxId: value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                label="Tipo ID"
                value={form.taxIdType || "NONE"}
                onChange={(value) => setForm((current) => ({ ...current, taxIdType: value }))}
                options={TAX_ID_TYPES}
              />
              <Field
                label="Condicion IVA"
                value={form.vatCondition || ""}
                onChange={(value) => setForm((current) => ({ ...current, vatCondition: value }))}
              />
              <Field
                label="Ingresos Brutos"
                value={form.grossIncomeNumber || ""}
                onChange={(value) => setForm((current) => ({ ...current, grossIncomeNumber: value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Direccion fiscal"
                value={form.fiscalAddress || ""}
                onChange={(value) => setForm((current) => ({ ...current, fiscalAddress: value }))}
              />
              <Field label="Ciudad" value={form.city || ""} onChange={(value) => setForm((current) => ({ ...current, city: value }))} />
              <Field label="Provincia" value={form.province || ""} onChange={(value) => setForm((current) => ({ ...current, province: value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Punto de venta sugerido"
                value={form.pointOfSaleSuggested || ""}
                onChange={(value) => setForm((current) => ({ ...current, pointOfSaleSuggested: value }))}
              />
              <SelectField
                label="Comprobante sugerido"
                value={form.defaultSuggestedFiscalVoucherType || "NONE"}
                onChange={(value) => setForm((current) => ({ ...current, defaultSuggestedFiscalVoucherType: value }))}
                options={VOUCHER_TYPES}
              />
            </div>
          </BusinessSection>
        </TabsContent>

        <TabsContent value="accountant" className="space-y-5">
          <BusinessSection
            icon={<UserCircle2 className="h-5 w-5" />}
            title="Contacto contador"
            helper="Organiza la entrega al estudio contable sin salir del centro de negocio."
            tone="violet"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Nombre del contador"
                value={form.accountantName || ""}
                onChange={(value) => setForm((current) => ({ ...current, accountantName: value }))}
                placeholder="Ej. Estudio Garcia"
              />
              <Field
                label="Email del contador"
                value={form.accountantEmail || ""}
                onChange={(value) => setForm((current) => ({ ...current, accountantEmail: value }))}
                placeholder="contador@estudio.com"
              />
            </div>
            <div className="rounded-[20px] border border-white/8 bg-surface/55 p-4 text-sm leading-6 text-muted">
              Centralizar este contacto ayuda a ordenar la operatoria fiscal y el seguimiento del negocio sin reescribir datos en cada flujo.
            </div>
          </BusinessSection>
        </TabsContent>
      </Tabs>

      <div className="rounded-[24px] border border-brand/15 bg-[linear-gradient(180deg,rgba(21,18,15,0.9),rgba(10,16,25,0.98))] p-4 shadow-[0_20px_50px_rgba(176,80,0,0.08)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Guardar cambios</p>
            <p className="mt-1 text-sm leading-6 text-muted">La configuracion actualiza la identidad y operatoria del negocio sin tocar historicos.</p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Button type="submit" className="rounded-2xl" disabled={isSaving || uploadingImage}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
            {feedback.tone ? <p className={`text-xs ${feedback.tone === "success" ? "text-emerald-300" : "text-red-300"}`}>{feedback.text}</p> : null}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand),#ffb14a)] transition-all" style={{ width: `${Math.max(completion.progress, completion.completed > 0 ? 8 : 0)}%` }} />
        </div>
      </div>
    </form>
  );
}

function BusinessSection({
  icon,
  title,
  helper,
  tone,
  children
}: {
  icon: React.ReactNode;
  title: string;
  helper: string;
  tone: "brand" | "green" | "violet";
  children: React.ReactNode;
}) {
  const toneClasses = {
    brand: "border-brand/20 bg-brand/10 text-brandBright",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300"
  } as const;

  return (
    <section className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,23,0.94))] p-5 shadow-[var(--card-shadow)]">
      <div className="mb-5 flex items-start gap-3">
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${toneClasses[tone]}`}>{icon}</span>
        <div>
          <p className="text-2xl font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{helper}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  multiline = false,
  rows = 4
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-white">{label}</span>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span> : null}
        {multiline ? (
          <Textarea className={icon ? "pl-11" : ""} rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        ) : (
          <Input className={icon ? "pl-10" : ""} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        )}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-white">{label}</span>
      <select
        className="h-10 w-full rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-surface/55 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{helper}</p>
    </div>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
