import { ArrowRightLeft, Bot, ChartNoAxesColumn, MessagesSquare, Users } from "lucide-react";
import { Section } from "@/components/ui/Section";

const capabilities = [
  {
    title: "Todos los chats en un mismo lugar",
    description: "Cada conversacion entra con contexto, responsable y proximo paso visible para todo el equipo.",
    icon: MessagesSquare
  },
  {
    title: "Cada cliente con historial real",
    description: "El contacto, lo que pidio y en que etapa esta la venta quedan ordenados en la misma ficha.",
    icon: Users
  },
  {
    title: "Primeras respuestas y seguimiento activos",
    description: "Las respuestas iniciales y recordatorios dejan de depender de quien se acuerda primero.",
    icon: Bot
  },
  {
    title: "Cada mensaje se vuelve oportunidad",
    description: "Lo que antes quedaba en un chat suelto pasa a ser una venta visible para trabajarla y cerrarla.",
    icon: ArrowRightLeft
  },
  {
    title: "El pipeline muestra que hacer despues",
    description: "Sabes que esta por entrar, que esta tibio y que hay que empujar hoy para cerrar.",
    icon: ChartNoAxesColumn
  }
];

export function HomeSolution() {
  return (
    <Section id="solucion">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-end">
        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">La propuesta</p>
          <h2 className="text-balance text-3xl font-semibold md:text-5xl">
            Opturon convierte conversaciones en ventas
          </h2>
        </div>
        <div className="max-w-2xl">
          <p className="text-lg leading-8 text-muted">
            No se trata solo de responder WhatsApp. Se trata de ordenar lo que entra, seguir lo que importa y mover
            cada oportunidad hasta el cierre desde un mismo flujo.
          </p>
        </div>
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
        <p className="text-lg font-semibold text-text md:text-2xl">
          Menos chats sueltos. Mas seguimiento visible. Mas chances reales de cerrar.
        </p>
      </div>
    </Section>
  );
}
