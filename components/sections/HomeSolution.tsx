import { ArrowRightLeft, Bot, ChartNoAxesColumn, MessagesSquare, Users } from "lucide-react";
import { Section } from "@/components/ui/Section";

const capabilities = [
  {
    title: "Centraliza los mensajes",
    description: "Todo entra al mismo flujo para que el equipo vea contexto y proximo paso.",
    icon: MessagesSquare
  },
  {
    title: "Organiza cada cliente",
    description: "Cada conversacion queda asociada a un contacto con historial y estado comercial.",
    icon: Users
  },
  {
    title: "Automatiza respuestas",
    description: "Las primeras respuestas y seguimientos dejan de depender de memoria humana.",
    icon: Bot
  },
  {
    title: "Crea oportunidades",
    description: "Un mensaje se convierte en oportunidad visible para trabajarla y cerrarla.",
    icon: ArrowRightLeft
  },
  {
    title: "Permite hacer seguimiento",
    description: "El pipeline muestra donde esta cada venta y que toca hacer despues.",
    icon: ChartNoAxesColumn
  }
];

export function HomeSolution() {
  return (
    <Section id="solucion">
      <div className="max-w-4xl space-y-5">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">La propuesta</p>
        <h2 className="text-balance text-3xl font-semibold md:text-5xl">
          Opturon convierte conversaciones en ventas
        </h2>
        <p className="max-w-3xl text-lg text-muted">
          Centraliza todos los mensajes, organiza cada cliente, automatiza respuestas, crea oportunidades de venta y
          te permite hacer seguimiento sin salir del mismo flujo.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {capabilities.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-3xl border border-[color:var(--border)] bg-card/85 p-5 xl:min-h-[15rem]"
            >
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10">
                <Icon className="h-4 w-4 text-brandBright" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
            </article>
          );
        })}
      </div>

      <div className="mt-8 rounded-3xl border border-brand/30 bg-[linear-gradient(135deg,rgba(176,80,0,0.16),rgba(255,255,255,0.04))] px-6 py-5">
        <p className="text-lg font-semibold text-text md:text-2xl">Todo en un solo sistema.</p>
      </div>
    </Section>
  );
}
