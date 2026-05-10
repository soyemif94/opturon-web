import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/ui/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-[color:var(--border)] bg-[color:var(--surface-muted)] text-text",
      muted: "border-[color:var(--field-border)] bg-[color:var(--field-bg)] text-muted",
      success: "border-[color:var(--success-border)] bg-[color:var(--success-bg)] text-[color:var(--success-text)]",
      warning: "border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] text-[color:var(--warning-text)]",
      danger: "border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] text-[color:var(--danger-text)]",
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

