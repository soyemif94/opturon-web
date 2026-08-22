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
    <div className={compactMobile ? "space-y-4 sm:space-y-6" : "space-y-6"}>
      <section className={`overflow-hidden border border-[color:var(--border)] bg-[image:var(--page-hero-gradient)] shadow-[var(--card-shadow)] ${compactMobile ? "rounded-[22px] p-3 sm:rounded-[28px] sm:p-6 lg:p-8" : "rounded-[28px] p-6 lg:p-8"}`}>
        <div className={`flex flex-col lg:flex-row lg:items-start lg:justify-between ${compactMobile ? "gap-3 sm:gap-5" : "gap-5"}`}>
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
            <h1 className={`${backHref ? "mt-5" : compactMobile ? "mt-2 sm:mt-4" : "mt-4"} ${compactMobile ? "text-2xl sm:text-3xl" : "text-3xl"} font-semibold tracking-tight`}>{title}</h1>
            <p className={`mt-3 text-sm leading-7 text-muted lg:text-base ${compactMobile ? "hidden sm:block" : ""}`}>{description}</p>
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
