import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientPageShell({
  title,
  description,
  badge,
  children
}: {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(192,80,0,0.14),rgba(18,18,18,0.96)_42%,rgba(14,14,14,0.98))] p-6 lg:p-8">
        <div className="max-w-3xl">
          {badge ? <Badge variant="warning">{badge}</Badge> : null}
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted lg:text-base">{description}</p>
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
