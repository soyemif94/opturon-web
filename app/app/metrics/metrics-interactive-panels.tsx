"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Tone = "orange" | "amber" | "green" | "violet" | "sky";

export type DailyActivityPoint = {
  key: string;
  label: string;
  total: number;
  bot: number;
  human: number;
  pending: number;
};

export type HeatmapCellRow = {
  label: string;
  values: Array<{
    dayLabel: string;
    timeLabel: string;
    value: number;
    bot: number;
    human: number;
    pending: number;
  }>;
};

export type StatusRowItem = {
  label: string;
  value: number;
  tone: Tone;
};

export type InsightItem = {
  title: string;
  detail: string;
  tone: Tone;
};

export type CompactInsight = {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
  iconKey: "sparkles" | "clock" | "wand";
};

export function MetricsInteractivePanels({
  periodLabel,
  dailyActivity,
  statusRows,
  heatmap,
  totalVisibleActivity,
  botManagedConversations,
  activeConversations,
  pendingConversations,
  avgResponseLabel,
  recentInsights,
  insights
}: {
  periodLabel: string;
  dailyActivity: DailyActivityPoint[];
  statusRows: StatusRowItem[];
  heatmap: HeatmapCellRow[];
  totalVisibleActivity: number;
  botManagedConversations: number;
  activeConversations: number;
  pendingConversations: number;
  avgResponseLabel: string;
  recentInsights: InsightItem[];
  insights: CompactInsight[];
}) {
  const defaultDay = dailyActivity.reduce((current, item) => (item.total > current.total ? item : current), dailyActivity[0] || emptyDay());
  const defaultHeatCell =
    heatmap.flatMap((row) => row.values).reduce((current, item) => (item.value > current.value ? item : current), emptyCell());

  const [selectedDayKey, setSelectedDayKey] = useState(defaultDay.key);
  const [selectedHeatKey, setSelectedHeatKey] = useState(`${defaultHeatCell.dayLabel}-${defaultHeatCell.timeLabel}`);

  const maxDailyValue = useMemo(() => Math.max(1, ...dailyActivity.map((item) => item.total)), [dailyActivity]);
  const heatMax = useMemo(() => Math.max(1, ...heatmap.flatMap((row) => row.values.map((cell) => cell.value))), [heatmap]);

  const selectedDay = dailyActivity.find((item) => item.key === selectedDayKey) || defaultDay;
  const selectedHeatCell =
    heatmap.flatMap((row) => row.values).find((cell) => `${cell.dayLabel}-${cell.timeLabel}` === selectedHeatKey) || defaultHeatCell;

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-[28px] leading-none tracking-tight">Interacciones por dia</CardTitle>
                <CardDescription className="mt-2 text-sm">
                  Tendencia visible del canal durante los ultimos 30 dias.
                </CardDescription>
              </div>
              <Badge variant="outline">{periodLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <div className="flex flex-wrap items-center gap-5 text-sm">
                <LegendDot label="Interacciones visibles" color="bg-brand" />
                <LegendDot label="Bot activo" color="bg-emerald-500" />
                <span className="text-xs text-muted">Fuente: ultimas conversaciones visibles del canal.</span>
              </div>
              <div className="mt-5">
                <div className="relative h-64">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3].map((line) => (
                      <div key={line} className="border-t border-white/6" />
                    ))}
                  </div>
                  <div className="relative h-full">
                    <LineArea values={dailyActivity.map((item) => item.total)} maxValue={maxDailyValue} tone="orange" />
                    <LineArea values={dailyActivity.map((item) => item.bot)} maxValue={maxDailyValue} tone="green" />
                    <div className="absolute inset-0 flex items-end">
                      {dailyActivity.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedDayKey(item.key)}
                          className="group relative h-full flex-1"
                          aria-label={`Seleccionar ${item.label}`}
                        >
                          <span
                            className={`absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 ${
                              selectedDayKey === item.key ? "border-brand bg-brand shadow-[0_0_0_6px_rgba(192,80,0,0.12)]" : "border-white/10 bg-white/10"
                            }`}
                            style={{ bottom: `${(item.total / maxDailyValue) * 88 + 4}%` }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-6 gap-2 text-xs text-muted xl:grid-cols-10">
                  {dailyActivity
                    .filter((_, index) => index % 3 === 0 || index === dailyActivity.length - 1)
                    .map((item) => (
                      <span key={item.label}>{item.label}</span>
                    ))}
                </div>
              </div>

              <div className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-bg/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Detalle del {selectedDay.label}</p>
                    <p className="mt-1 text-sm text-muted">Basado en ultimas conversaciones visibles del canal.</p>
                  </div>
                  <Badge variant="warning">{formatNumber(selectedDay.total)} visibles</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <DetailStat label="Interacciones visibles" value={formatNumber(selectedDay.total)} />
                  <DetailStat label="Bot activo" value={formatNumber(selectedDay.bot)} />
                  <DetailStat label="Con responsable" value={formatNumber(selectedDay.human)} />
                  <DetailStat label="Pendientes" value={formatNumber(selectedDay.pending)} />
                </div>
                <p className="mt-4 text-sm text-muted">
                  {selectedDay.total > 0
                    ? `El ${selectedDay.label} hubo ${formatNumber(selectedDay.total)} movimientos visibles, ${formatNumber(selectedDay.bot)} con bot activo y ${formatNumber(selectedDay.pending)} pendientes.`
                    : "No hay dato suficiente para explicar este dia."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Visibilidad comercial del canal</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Distribucion ejecutiva entre automatizacion, responsables y pendientes visibles.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Resumen del periodo</p>
              <p className="mt-2 text-3xl font-semibold">{formatNumber(totalVisibleActivity)}</p>
              <p className="mt-1 text-sm text-muted">Volumen visible del canal durante {periodLabel.toLowerCase()}.</p>
              <div className="mt-4 grid gap-3">
                <DetailMetric
                  label="Cobertura automatizada"
                  value={`${conversationPercent(botManagedConversations, activeConversations)}%`}
                  helper={`${formatNumber(botManagedConversations)} conversaciones con bot activo`}
                  source="Basada en conversaciones visibles con bot activo."
                  tone="orange"
                />
                <DetailMetric
                  label="Intervencion humana"
                  value={`${conversationPercent(activeConversations - botManagedConversations - pendingConversations, activeConversations)}%`}
                  helper={`${formatNumber(Math.max(activeConversations - botManagedConversations - pendingConversations, 0))} conversaciones con responsable`}
                  source="Basada en conversaciones visibles con responsable asignado."
                  tone="green"
                />
                <DetailMetric
                  label="Pendientes visibles"
                  value={`${conversationPercent(pendingConversations, activeConversations)}%`}
                  helper={`${formatNumber(pendingConversations)} sin cobertura clara`}
                  source="Basada en conversaciones visibles sin bot activo ni responsable."
                  tone="sky"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.55fr)_minmax(340px,0.9fr)]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Tiempo de respuesta promedio</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Promedio visible del backlog comercial actual.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-4xl font-semibold">{avgResponseLabel}</p>
                  <p className="mt-2 text-sm text-muted">Promedio general visible hoy</p>
                </div>
                <Badge variant="outline">Fuente: `slaMinutes` visibles</Badge>
              </div>
              <MiniSparkline values={dailyActivity.map((item) => Math.max(item.human + item.pending, 0))} className="mt-6" tone="violet" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Conversaciones por estado</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Como se reparte hoy el canal entre nuevas, activas, seguimiento y cierre.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {statusRows.map((row) => (
              <StatusRow key={row.label} label={row.label} value={row.value} total={Math.max(activeConversations, 1)} tone={row.tone} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Horarios de mayor actividad</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Una lectura simple para entender cuando el canal recibe mas movimiento.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/60 p-4">
              <div className="grid gap-2">
                {heatmap.map((row) => (
                  <div key={row.label} className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] items-center gap-2">
                    <span className="text-xs text-muted">{row.label}</span>
                    {row.values.map((cell) => (
                      <button
                        key={`${row.label}-${cell.dayLabel}`}
                        type="button"
                        onClick={() => setSelectedHeatKey(`${cell.dayLabel}-${cell.timeLabel}`)}
                        className={`h-9 rounded-lg border ${selectedHeatKey === `${cell.dayLabel}-${cell.timeLabel}` ? "border-brand/50 ring-1 ring-brand/35" : "border-white/6"}`}
                        style={{ backgroundColor: heatColor(cell.value, heatMax) }}
                        title={`${cell.dayLabel} ${cell.timeLabel}: ${cell.value}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
                <span>{heatmap[0]?.values.map((item) => item.dayLabel).join(" · ")}</span>
                <Badge variant="warning">{selectedHeatCell.dayLabel ? `${selectedHeatCell.dayLabel} ${selectedHeatCell.timeLabel}` : "Sin pico visible"}</Badge>
              </div>

              <div className="mt-5 rounded-[20px] border border-[color:var(--border)] bg-bg/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {selectedHeatCell.dayLabel} {selectedHeatCell.timeLabel}
                    </p>
                    <p className="mt-1 text-sm text-muted">Basado en ultimas conversaciones visibles.</p>
                  </div>
                  <Badge variant="warning">{formatNumber(selectedHeatCell.value)} movimientos</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <DetailStat label="Movimientos" value={formatNumber(selectedHeatCell.value)} />
                  <DetailStat label="Bot activo" value={formatNumber(selectedHeatCell.bot)} />
                  <DetailStat label="Con responsable" value={formatNumber(selectedHeatCell.human)} />
                  <DetailStat label="Pendientes" value={formatNumber(selectedHeatCell.pending)} />
                </div>
                <p className="mt-4 text-sm text-muted">
                  {selectedHeatCell.value > 0
                    ? `${selectedHeatCell.dayLabel} ${selectedHeatCell.timeLabel} concentro ${formatNumber(selectedHeatCell.value)} movimientos visibles.`
                    : "No hay dato suficiente para explicar esta franja."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Actividad reciente</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Insights operativos simples para entender lo que esta pasando en el canal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 md:grid-cols-3">
            {recentInsights.map((item) => (
              <InsightTile key={item.title} title={item.title} detail={item.detail} tone={item.tone} />
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90 shadow-[var(--card-shadow)]">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-[28px] leading-none tracking-tight">Lectura rapida</CardTitle>
              <CardDescription className="mt-2 text-sm">
                Los tres indicadores que mas resumen el trabajo del canal hoy.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {insights.map((card) => (
              <CompactInsightCard key={card.label} label={card.label} value={card.value} helper={card.helper} tone={card.tone} iconKey={card.iconKey} />
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function DetailMetric({
  label,
  value,
  helper,
  source,
  tone
}: {
  label: string;
  value: string;
  helper: string;
  source: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-bg/55 px-3.5 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${toneValueClass(tone)}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
      <p className="mt-2 text-[11px] leading-5 text-muted">{source}</p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[color:var(--border)] bg-surface/50 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  total,
  tone
}: {
  label: string;
  value: number;
  total: number;
  tone: Tone;
}) {
  const pct = Math.round((value / Math.max(total, 1)) * 100);
  return (
    <div className="rounded-[18px] border border-[color:var(--border)] bg-surface/55 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text">{label}</span>
        <span className="text-sm font-medium text-text">
          {formatNumber(value)} ({pct}%)
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/5">
        <div className={`h-2 rounded-full ${toneBarClass(tone)}`} style={{ width: `${Math.max(8, pct)}%` }} />
      </div>
    </div>
  );
}

function InsightTile({ title, detail, tone }: { title: string; detail: string; tone: Tone }) {
  return (
    <div className={`rounded-[22px] border p-4 ${toneSurfaceClass(tone)}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}

function CompactInsightCard({
  label,
  value,
  helper,
  tone,
  iconKey
}: {
  label: string;
  value: string;
  helper: string;
  tone: Tone;
  iconKey: "sparkles" | "clock" | "wand";
}) {
  return (
    <div className="rounded-[22px] border border-[color:var(--border)] bg-surface/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-sm text-muted">{helper}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[18px] border ${toneIconClass(tone)}`}>
          <span className="text-lg">{iconKey === "sparkles" ? "✦" : iconKey === "clock" ? "◔" : "⌁"}</span>
        </span>
      </div>
      <p className={`mt-4 text-2xl font-semibold ${toneValueClass(tone)}`}>{value}</p>
    </div>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function DistributionRing({ values }: { values: number[] }) {
  const [bot, human, pending] = values;
  const botAngle = (bot / 100) * 360;
  const humanAngle = (human / 100) * 360;
  return (
    <div
      className="relative h-40 w-40 shrink-0 rounded-full"
      style={{
        background: `conic-gradient(#ff8a1f 0deg ${botAngle}deg, #21c17a ${botAngle}deg ${botAngle + humanAngle}deg, #33a6ff ${botAngle + humanAngle}deg 360deg)`
      }}
    >
      <div className="absolute inset-[18px] flex items-center justify-center rounded-full border border-[color:var(--border)] bg-bg">
        <div className="text-center">
          <p className="text-3xl font-semibold">{values[0] + values[1] + values[2]}%</p>
          <p className="mt-1 text-sm text-muted">Cobertura</p>
        </div>
      </div>
    </div>
  );
}

function LineArea({
  values,
  maxValue,
  tone
}: {
  values: number[];
  maxValue: number;
  tone: "orange" | "green";
}) {
  if (!values.length) return null;
  const width = 100;
  const height = 100;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / Math.max(maxValue, 1)) * 88 - 6;
      return `${x},${y}`;
    })
    .join(" ");
  const stroke = tone === "orange" ? "#ff8a1f" : "#21c17a";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 h-full w-full">
      <polyline fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function MiniSparkline({ values, className = "", tone }: { values: number[]; className?: string; tone: "violet" | "orange" }) {
  if (!values.length) return null;
  const width = 120;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline fill="none" stroke={tone === "violet" ? "#8b5cf6" : "#ff8a1f"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function emptyDay(): DailyActivityPoint {
  return { key: "empty", label: "Sin dato", total: 0, bot: 0, human: 0, pending: 0 };
}

function emptyCell() {
  return { dayLabel: "", timeLabel: "", value: 0, bot: 0, human: 0, pending: 0 };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(Number.isFinite(value) ? value : 0);
}

function conversationPercent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function heatColor(value: number, max: number) {
  const alpha = max > 0 ? value / max : 0;
  if (alpha === 0) return "rgba(255,255,255,0.03)";
  const intensity = 0.14 + alpha * 0.62;
  return `rgba(255,138,31,${intensity.toFixed(2)})`;
}

function toneIconClass(tone: Tone) {
  if (tone === "orange") return "border-brand/25 bg-brand/10 text-brandBright";
  if (tone === "amber") return "border-[#f2a44c]/20 bg-[#f2a44c]/10 text-[#f2a44c]";
  if (tone === "green") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (tone === "violet") return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  return "border-sky-500/20 bg-sky-500/10 text-sky-300";
}

function toneSurfaceClass(tone: Tone) {
  if (tone === "orange") return "border-brand/18 bg-[linear-gradient(180deg,rgba(192,80,0,0.12),rgba(255,255,255,0.02))]";
  if (tone === "amber") return "border-[#f2a44c]/18 bg-[linear-gradient(180deg,rgba(242,164,76,0.12),rgba(255,255,255,0.02))]";
  if (tone === "green") return "border-emerald-500/18 bg-[linear-gradient(180deg,rgba(34,120,84,0.12),rgba(255,255,255,0.02))]";
  if (tone === "violet") return "border-violet-500/18 bg-[linear-gradient(180deg,rgba(109,76,205,0.12),rgba(255,255,255,0.02))]";
  return "border-sky-500/18 bg-[linear-gradient(180deg,rgba(51,166,255,0.12),rgba(255,255,255,0.02))]";
}

function toneValueClass(tone: Tone) {
  if (tone === "orange") return "text-brandBright";
  if (tone === "amber") return "text-[#f2a44c]";
  if (tone === "green") return "text-emerald-300";
  if (tone === "violet") return "text-violet-300";
  return "text-sky-300";
}

function toneBarClass(tone: Tone) {
  if (tone === "orange") return "bg-brand";
  if (tone === "amber") return "bg-[#f2a44c]";
  if (tone === "green") return "bg-emerald-500";
  if (tone === "violet") return "bg-violet-500";
  return "bg-sky-500";
}
