import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientPageShell } from "@/components/app/client-page-shell";

export default function AppSettingsPage() {
  return (
    <ClientPageShell
      title="Configuracion"
      description="Resumen claro de la cuenta cliente y accesos a futuras configuraciones del negocio."
      badge="Account"
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="muted">Negocio</Badge>}>
            <div>
              <CardTitle className="text-xl">Datos del negocio</CardTitle>
              <CardDescription>Este bloque puede vincularse con la configuracion operativa ya existente.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Link href="/app/business" className="block rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm hover:bg-surface/90">
              Abrir configuracion del negocio
            </Link>
            <Link href="/app/users" className="block rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm hover:bg-surface/90">
              Gestionar usuarios del portal
            </Link>
          </CardContent>
        </Card>

        <Card className="border-white/6 bg-card/90">
          <CardHeader action={<Badge variant="warning">Roadmap</Badge>}>
            <div>
              <CardTitle className="text-xl">Preferencias del portal</CardTitle>
              <CardDescription>Base visual para sumar branding, horarios y permisos granulares.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {["Branding del negocio", "Usuarios y permisos", "Horario de atención", "Preferencias del bot"].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] bg-surface/65 p-4 text-sm text-muted">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ClientPageShell>
  );
}
