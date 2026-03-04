"use client";

import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/ui/cn";

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error("Popover components must be used within <Popover>.");
  return context;
}

export function Popover({ children, open: controlledOpen, onOpenChange }: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  asChild = false,
  className
}: React.PropsWithChildren<{ asChild?: boolean; className?: string }>) {
  const { open, setOpen } = usePopoverContext();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(!asChild && "rounded-xl border border-[color:var(--border)] bg-bg px-3 py-1.5 text-sm", className)}
      onClick={() => setOpen(!open)}
    >
      {children}
    </Comp>
  );
}

export function PopoverContent({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  const { open, setOpen } = usePopoverContext();
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!ref.current || (target && ref.current.contains(target))) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn("absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-2xl border border-[color:var(--border)] bg-card p-2 shadow-lg", className)}
    >
      {children}
    </div>
  );
}

export function CommandPopover({
  value,
  onValueChange,
  placeholder,
  items,
  onSelect
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  items: Array<{ id: string; label: string; description?: string }>;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="mb-2 h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm"
        placeholder={placeholder || "Buscar..."}
      />
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-left hover:bg-muted/50"
            onClick={() => onSelect(item.id)}
          >
            <p className="text-sm font-medium">{item.label}</p>
            {item.description ? <p className="text-xs text-muted">{item.description}</p> : null}
          </button>
        ))}
        {items.length === 0 ? <p className="py-4 text-center text-xs text-muted">Sin resultados</p> : null}
      </div>
    </div>
  );
}

