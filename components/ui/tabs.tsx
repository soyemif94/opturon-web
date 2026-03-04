"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used within <Tabs>.");
  return context;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children
}: React.PropsWithChildren<{ value?: string; defaultValue?: string; onValueChange?: (value: string) => void }>) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const selected = value ?? internalValue;
  const setValue = onValueChange ?? setInternalValue;
  return <TabsContext.Provider value={{ value: selected, onValueChange: setValue }}>{children}</TabsContext.Provider>;
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex rounded-2xl border border-[color:var(--border)] bg-muted p-1", className)} {...props} />;
}

export function TabsTrigger({
  value,
  className,
  children
}: React.PropsWithChildren<{ value: string; className?: string }>) {
  const { value: selected, onValueChange } = useTabsContext();
  const active = selected === value;
  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={cn("rounded-xl px-3 py-1.5 text-sm", active ? "bg-card shadow-sm" : "text-muted hover:text-text", className)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: React.PropsWithChildren<{ value: string; className?: string }>) {
  const { value: selected } = useTabsContext();
  if (selected !== value) return null;
  return <div className={cn(className)}>{children}</div>;
}

