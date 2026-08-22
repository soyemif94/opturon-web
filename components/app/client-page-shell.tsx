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
  compactMobile = false,
  children
}: {
  title: string;
  description: string;
  badge?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  compactMobile?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div data-operational-workspace className={`min-w-0 max-w-full ${compactMobile ? "space-y-4 sm:space-y-6" : "space-y-6"}`}>
      <section className={`min-w-0 max-w-full overflow-hidden border border-[color:var(--border)] bg-[image:var(--page-hero-gradient)] shadow-[var(--card-shadow)] ${compactMobile ? "rounded-[22px] p-3 sm:rounded-[28px] sm:p-6 lg:p-8" : "rounded-[22px] p-4 sm:rounded-[28px] sm:p-6 lg:p-8"}`}>
        <div className={`flex flex-col lg:flex-row lg:items-start lg:justify-between ${compactMobile ? "gap-3 sm:gap-5" : "gap-5"}`}>
          <div className="min-w-0 max-w-3xl">
            {backHref ? (
              <Button asChild variant="secondary" size="sm" className="rounded-2xl">
                <Link href={backHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {backLabel || "Volver"}
                </Link>
              </Button>
            ) : null}
            {badge ? <Badge variant="warning">{badge}</Badge> : null}
            <h1 className={`${backHref ? "mt-5" : compactMobile ? "mt-2 sm:mt-4" : "mt-4"} ${compactMobile ? "text-2xl sm:text-3xl" : "text-2xl sm:text-3xl"} break-words font-semibold tracking-tight`}>{title}</h1>
            <p className={`mt-3 break-words text-sm leading-6 text-muted sm:leading-7 lg:text-base ${compactMobile ? "hidden sm:block" : ""}`}>{description}</p>
          </div>
          {action ? <div className="flex min-w-0 items-start sm:shrink-0">{action}</div> : null}
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
