import { Section } from "@/components/ui/Section";

const traditionalCrm = ["Carga manual", "Seguimiento manual", "Procesos lentos"];
const opturonWay = ["Conversaciones automaticas", "Seguimiento en tiempo real", "Ventas desde WhatsApp"];

export function HomeDifferentiator() {
  return (
    <Section className="border-y border-[color:var(--border)] bg-surface/30">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Diferencial</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">No es un CRM mas</h2>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-black/10 p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">CRM tradicional</p>
          <div className="mt-6 grid gap-3">
            {traditionalCrm.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-text">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-brand/35 bg-[linear-gradient(135deg,rgba(176,80,0,0.16),rgba(255,255,255,0.05))] p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brandBright">Opturon</p>
          <div className="mt-6 grid gap-3">
            {opturonWay.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-brand/30 bg-black/15 px-4 py-4 text-sm font-medium text-text"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>
    </Section>
  );
}
