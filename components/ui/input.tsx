import * as React from "react";
import { cn } from "@/lib/ui/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-3 text-sm text-text placeholder:text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
