import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientPageShell({
  title,
  description,
  badge,
  action,
  backHref,
  backLabel,
  children
}: {
  title: string;
  description: string;
  badge?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[image:var(--page-hero-gradient)] p-6 shadow-[var(--card-shadow)] lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {backHref ? (
              <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                <Link href={backHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {backLabel || "Volver"}
                </Link>
              </Button>
            ) : null}
            {badge ? <Badge variant="warning">{badge}</Badge> : null}
            <h1 className={`${backHref ? "mt-5" : "mt-4"} text-3xl font-semibold tracking-tight`}>{title}</h1>
            <p className="mt-3 text-sm leading-7 text-muted lg:text-base">{description}</p>
          </div>
          {action ? <div className="flex shrink-0 items-start">{action}</div> : null}
        </div>
      </section>
      {children}
    </div>
  );
}

export function InfoCard({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-white/6 bg-card/90">
      <CardHeader action={action}>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0" />
    </Card>
  );
}
