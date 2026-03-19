import { Clock3, Flame, MessageSquareOff, Target } from "lucide-react";
import { Section } from "@/components/ui/Section";

const painPoints = [
  {
    title: "Respondes tarde",
    text: "El cliente llega con interes real y recibe respuesta cuando ya comparo, dudo o se fue con otro.",
    icon: Clock3
  },
  {
    title: "Los clientes se enfrian",
    text: "Sin seguimiento claro, la conversacion se enfria aunque el contacto ya estaba listo para avanzar.",
    icon: Flame
  },
  {
    title: "Pierdes el hilo",
    text: "El historial queda repartido y el equipo deja de saber que prometio, que falta y quien sigue.",
    icon: MessageSquareOff
  },
  {
    title: "No sabes que cerrar",
    text: "Sin prioridad ni proximo paso, todo parece urgente y las ventas mas calientes quedan mezcladas con el resto.",
    icon: Target
  }
];

export function HomeProblems() {
  return (
    <Section className="border-y border-[color:var(--border)] bg-surface/30">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-8">
        <div className="max-w-xl space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">El problema</p>
          <h2 className="text-balance text-3xl font-semibold md:text-5xl">
            No estas perdiendo consultas. Estas perdiendo ventas despues del primer mensaje.
          </h2>
          <p className="text-lg leading-8 text-muted">
            Cuando el equipo responde tarde, nadie sabe que contacto seguir y el estado de cada venta queda perdido en
            chats sueltos.
          </p>
          <div className="space-y-3 text-base text-text/90">
            <p>Respondes tarde y el lead se enfria.</p>
            <p>Respondes, pero no sabes a quien hacerle seguimiento.</p>
            <p>Perdes conversaciones que si podian convertirse en ventas.</p>
            <p>Nadie sabe a quien hay que cerrar hoy.</p>
            <p>El seguimiento depende de memoria humana.</p>
            <p>El pipeline real de ventas no existe.</p>
          </div>
          <p className="text-base font-medium text-text">Ahi es donde se escapan las ventas que ya estaban empezadas.</p>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brandBright">Para eso existe Opturon.</p>
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
