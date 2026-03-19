import { Section } from "@/components/ui/Section";

const steps = [
  "Llega un mensaje por WhatsApp",
  "Se crea el cliente automaticamente",
  "Se organiza en el inbox",
  "Se convierte en oportunidad",
  "Se mueve en el pipeline",
  "Se cierra la venta"
];

export function HomeProcess() {
  return (
    <Section className="border-y border-[color:var(--border)] bg-surface/35">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-brandBright">Como funciona</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">De mensaje a venta, sin perder el hilo</h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          El recorrido comercial tiene que entenderse rapido: entra un chat, se ordena, se sigue y se mueve hasta el cierre.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => (
          <article
            key={step}
            className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-card/80 p-6"
          >
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-brand/10 blur-2xl" />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/40 bg-brand/10 text-sm font-semibold text-brandBright">
              {index + 1}
            </span>
            <p className="mt-5 max-w-[18rem] text-lg font-medium leading-8 text-text">{step}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
