import Link from "next/link";
import { Bell, Building2, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientPageShell } from "@/components/app/client-page-shell";

export default function AppSettingsPage() {
  return (
    <ClientPageShell
      title="Configuracion"
      description="Gestiona preferencias del workspace, accesos del equipo y ajustes generales del portal desde un solo lugar."
      badge="Workspace"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_340px]">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Centro de configuracion</Badge>}>
            <div>
              <CardTitle className="text-xl">Ajustes del workspace</CardTitle>
              <CardDescription>
                Organiza los datos del negocio, accesos del equipo y preferencias generales que impactan en la operacion diaria del portal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0">
            <SettingsLinkCard
              href="/app/business"
              icon={<Building2 className="h-4 w-4 text-brandBright" />}
              title="Cuenta y negocio"
              description="Datos principales del negocio que ayudan a responder mejor, ordenar la operacion y dar contexto al canal."
            />
            <SettingsLinkCard
              href="/app/users"
              icon={<Users className="h-4 w-4 text-brandBright" />}
              title="Usuarios del workspace"
              description="Revisa quien accede al portal y como se distribuye el trabajo dentro del equipo."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <SettingsStaticCard
                icon={<Bell className="h-4 w-4 text-brandBright" />}
                title="Preferencias"
                description="Ajustes generales del portal y futuras opciones de notificaciones del workspace."
              />
              <SettingsStaticCard
                icon={<Shield className="h-4 w-4 text-brandBright" />}
                title="Seguridad"
                description="Base para accesos, cambios de cuenta y futuras configuraciones de seguridad."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Vista general</Badge>}>
            <div>
              <CardTitle className="text-xl">Que puedes gestionar aqui</CardTitle>
              <CardDescription>Resumen simple para entender que configuraciones afectan el funcionamiento del workspace.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              "Los datos del negocio mejoran la calidad de respuesta en el canal y en las automatizaciones.",
              "Los usuarios del portal ayudan a ordenar responsabilidades y el trabajo del equipo.",
              "Las preferencias del workspace permiten adaptar el portal al funcionamiento real del negocio.",
              "Esta seccion queda lista para crecer a roles, seguridad y configuraciones mas avanzadas."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm leading-6 text-muted">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ClientPageShell>
  );
}

function SettingsLinkCard({
  href,
  icon,
  title,
  description
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 transition-colors hover:bg-surface/90">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          {icon}
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function SettingsStaticCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          {icon}
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}
