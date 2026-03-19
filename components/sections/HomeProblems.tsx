import { Clock3, Flame, MessageSquareOff, Target } from "lucide-react";
import { Section } from "@/components/ui/Section";

const painPoints = [
  {
    title: "Respondes tarde",
    text: "El cliente escribe con intencion de compra y recibe respuesta cuando ya siguio de largo.",
    icon: Clock3
  },
  {
    title: "Los clientes se enfrían",
    text: "Sin seguimiento, las conversaciones se apagan aunque el contacto ya estaba interesado.",
    icon: Flame
  },
  {
    title: "Pierdes el hilo",
    text: "El historial queda en chats sueltos y nadie sabe en que quedo cada venta.",
    icon: MessageSquareOff
  },
  {
    title: "No sabes que cerrar",
    text: "Sin etapas ni prioridad, todo parece urgente y nada avanza con orden.",
    icon: Target
  }
];

export function HomeProblems() {
  return (
    <Section className="border-y border-[color:var(--border)] bg-surface/30">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="max-w-xl space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">El problema</p>
          <h2 className="text-balance text-3xl font-semibold md:text-5xl">
            El problema no es la cantidad de consultas
          </h2>
          <p className="text-lg text-muted">Es lo que pasa despues.</p>
          <div className="space-y-3 text-base text-text/90">
            <p>Respondes tarde.</p>
            <p>Se enfrían los clientes.</p>
            <p>Pierdes el seguimiento.</p>
            <p>No sabes en que estado esta cada venta.</p>
          </div>
          <p className="text-base font-medium text-text">
            Ahi es donde se pierde la mayor parte de las ventas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {painPoints.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-3xl border border-white/10 bg-card/90 p-6 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Icon className="h-5 w-5 text-brandBright" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{item.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
