import Link from "next/link";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AutomationsEmptyState() {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardHeader>
        <div>
          <CardTitle className="text-2xl">Aun no tienes automatizaciones activas</CardTitle>
          <CardDescription>
            Las automatizaciones permiten responder automaticamente cuando llegan mensajes por WhatsApp, ordenar prospectos y activar acciones sin depender
            siempre del equipo.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/65 p-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/5">
              <Bot className="h-5 w-5 text-brandBright" />
            </span>
            <div>
              <p className="font-medium">Empieza por una automatizacion simple</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Puedes configurar una bienvenida, un mensaje fuera de horario o una respuesta frecuente para empezar a automatizar sin complejidad.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-2xl px-5">
            <Link href="/app/automations/new">
              <Sparkles className="mr-2 h-4 w-4" />
              Crear primera automatizacion
            </Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-2xl px-5">
            <Link href="/app/integrations">Revisar canal conectado</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
