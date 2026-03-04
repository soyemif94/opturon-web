import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/ui/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-[color:var(--border)] bg-muted text-text",
      muted: "border-[color:var(--border)] bg-bg text-muted",
      success: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      warning: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
      danger: "border border-red-500/30 bg-red-500/10 text-red-300",
      outline: "border-[color:var(--border)] bg-transparent text-muted"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

