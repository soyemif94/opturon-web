import * as React from "react";
import { cn } from "@/lib/ui/cn";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-32 w-full rounded-2xl border border-[color:var(--field-border)] bg-[color:var(--field-bg)] px-4 py-3 text-sm leading-6 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
