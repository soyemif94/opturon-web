import Link from "next/link";
import { Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/Section";

type LegalPageShellProps = {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
};

const contactEmail = "contacto@opturon.com";

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-text md:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted md:text-[15px]">{children}</div>
    </section>
  );
}

export function LegalPageShell({ title, description, updatedAt, children }: LegalPageShellProps) {
  return (
    <Section className="pt-20 md:pt-24" containerClassName="max-w-5xl">
      <div className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brandBright">
            <ShieldCheck className="h-3.5 w-3.5" />
            Información pública de cumplimiento
          </div>
          <h1 className="text-balance text-4xl font-semibold md:text-5xl">{title}</h1>
          <p className="text-base leading-7 text-muted md:text-lg">{description}</p>
          <p className="text-sm text-muted">
            Última actualización: <span className="font-medium text-text">{updatedAt}</span>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="p-6 md:p-8">
            <article className="space-y-8">{children}</article>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text">Canales públicos</p>
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brandBright underline-offset-4 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {contactEmail}
                </a>
                <p className="text-sm leading-6 text-muted">
                  Usamos este canal para consultas de privacidad, solicitudes de eliminación y seguimiento de pedidos relacionados con datos.
                </p>
              </div>
            </Card>

            <Card className="p-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text">Enlaces útiles</p>
                <div className="flex flex-col gap-2 text-sm">
                  <Link href="/privacy" className="inline-flex items-center gap-2 text-text underline-offset-4 hover:text-brandBright hover:underline">
                    <ShieldCheck className="h-4 w-4" />
                    Política de privacidad
                  </Link>
                  <Link href="/data-deletion" className="inline-flex items-center gap-2 text-text underline-offset-4 hover:text-brandBright hover:underline">
                    <Trash2 className="h-4 w-4" />
                    Eliminación de datos
                  </Link>
                  <Link href="/" className="inline-flex items-center gap-2 text-text underline-offset-4 hover:text-brandBright hover:underline">
                    Volver al sitio principal
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Section>
  );
}

export { LegalSection, contactEmail };
