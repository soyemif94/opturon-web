import * as React from "react";
import { cn } from "@/lib/ui/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-[color:var(--border)] bg-card shadow-sm", className)} {...props} />;
}

export function CardHeader({
  className,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { action?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 p-4 pb-2", className)} {...props}>
      <div className="min-w-0 flex-1">{props.children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 p-4 pt-0", className)} {...props} />;
}

