import { ArrowRightLeft, Eye, MessagesSquare } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { getCardGlowClass } from "@/components/ui/card";

const evidenceCards = [
  {
    label: "Menos chats perdidos",
    value: "Cada consulta entra al mismo flujo en vez de quedar repartida entre conversaciones sueltas o responsables distintos.",
    icon: MessagesSquare
  },
  {
    label: "Seguimiento visible",
    value: "El equipo ve que responder, que seguir y que oportunidad empujar hoy sin depender de memoria humana.",
    icon: Eye
  },
  {
    label: "Trazabilidad comercial real",
    value: "Cada avance queda asociado al contacto, la etapa y el responsable para que el cierre no dependa de intuición ni contexto perdido.",
    icon: ArrowRightLeft
  }
];

export function HomeResults() {
  return (
    <Section className="border-y border-[color:var(--border)] bg-surface/35">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Lo que cambia en la operación</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
          Cuando el sistema se ordena, el impacto se vuelve visible
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          Opturon no entra para sumar ruido. Entra para que cada conversación tenga contexto, seguimiento y
          visibilidad comercial hasta el cierre.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article
          className={`rounded-[2rem] border border-brand/30 bg-[linear-gradient(135deg,rgba(176,80,0,0.14),rgba(255,255,255,0.04))] p-8 ${getCardGlowClass("orange")}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brandBright">Evidencia operativa</p>
          <h3 className="mt-5 max-w-3xl text-2xl font-semibold leading-10 text-text md:text-3xl">
            El cambio real no es tener más software. Es dejar de reaccionar chat por chat y empezar a trabajar un
            sistema comercial con criterio, prioridad y trazabilidad.
          </h3>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted">
            Cuando conversaciones, seguimiento y pipeline se conectan, el equipo deja de improvisar. Se vuelve claro
            qué entró hoy, qué está en riesgo, qué necesita respuesta y qué ya tiene suficiente intención para avanzar.
          </p>
          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-brand/25 bg-black/15 px-4 py-4 text-sm text-text/90">
              Menos dependencia de memoria humana para mover una venta.
            </div>
            <div className="rounded-2xl border border-brand/25 bg-black/15 px-4 py-4 text-sm text-text/90">
              Más velocidad para responder con contexto y prioridad clara.
            </div>
            <div className="rounded-2xl border border-brand/25 bg-black/15 px-4 py-4 text-sm text-text/90">
              Más oportunidades moviéndose en vez de quedar congeladas en el inbox.
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          {evidenceCards.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.label}
                className={`rounded-3xl border border-[color:var(--border)] bg-card/90 p-6 ${getCardGlowClass("green")}`}
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10">
                  <Icon className="h-4 w-4 text-brandBright" />
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-muted">{item.label}</p>
                <p className="mt-3 text-lg font-semibold leading-8 text-text">{item.value}</p>
              </article>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
