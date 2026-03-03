import { Section } from "@/components/ui/Section";

export function HomeDifferentiator() {
  return (
    <Section>
      <div className="rounded-3xl border border-brand/30 bg-brand-linear p-8 md:p-12">
        <p className="text-xs uppercase tracking-[0.2em] text-brandBright">Diferenciador</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">
          No vendemos bots. Diseñamos sistemas.
        </h2>
        <p className="mt-4 max-w-3xl text-muted md:text-lg">
          Cada implementación parte de tu operación real: procesos, objetivos y cuellos de botella. Por eso los
          resultados son medibles, sostenibles y escalables.
        </p>
      </div>
    </Section>
  );
}

