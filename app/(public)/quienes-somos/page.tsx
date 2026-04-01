import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const highlights = [
  "Centralizacion de conversaciones",
  "Pipeline comercial claro",
  "Automatizacion con IA",
  "Conversion medible"
];

export const metadata: Metadata = {
  title: "Opturon | Quienes Somos",
  description: "Opturon construye el sistema que convierte conversaciones en ventas."
};

export default function QuienesSomosPage() {
  return (
    <section className="container-opt py-20">
      <div className="max-w-4xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Quienes somos</p>
        <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold leading-tight md:text-6xl">
          Construimos el sistema que convierte tus conversaciones en ventas.
        </h1>
      </div>

      <Card cardGlow="green" className="mt-10 overflow-hidden rounded-[2rem] border-white/10 bg-card/95 p-8 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brandBright">El problema real</p>
              <p className="max-w-2xl text-lg leading-8 text-text/92">
                Opturon no nace para decorar un negocio con marketing. Nace para resolver un problema concreto:
                empresas que hablan con clientes todos los dias, pero pierden ventas por desorden, falta de
                seguimiento y poca automatizacion.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brandBright">Como lo resolvemos</p>
              <p className="max-w-2xl text-base leading-8 text-muted">
                Diseñamos el flujo completo: desde el primer mensaje hasta el cierre. Centralizamos conversaciones,
                organizamos oportunidades y automatizamos el proceso comercial con IA para que cada contacto tenga
                contexto, siguiente paso y continuidad real.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/8 px-5 py-4">
              <p className="text-base font-semibold text-text">
                El resultado no es mas trabajo. Es menos friccion, mas orden y un sistema que vende con mas
                consistencia.
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brandBright">Lo que instala Opturon</p>
            <div className="mt-5 grid gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                  <span className="text-sm font-medium text-text">{item}</span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm leading-7 text-muted">
              Estrategia, producto y automatizacion trabajando juntos para que la conversacion no se corte en el chat
              y llegue hasta la venta.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
