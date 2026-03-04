"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/ui/cn";

type ToastTone = "success" | "error" | "loading";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function emit(next: ToastItem[]) {
  items = next;
  listeners.forEach((listener) => listener(items));
}

function push(toastItem: Omit<ToastItem, "id">) {
  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  emit([...items, { id, ...toastItem }]);
  if (toastItem.tone !== "loading") {
    setTimeout(() => dismiss(id), 3500);
  }
  return id;
}

function dismiss(id: string) {
  emit(items.filter((item) => item.id !== id));
}

export const toast = {
  success: (title: string, description?: string) => push({ title, description, tone: "success" }),
  error: (title: string, description?: string) => push({ title, description, tone: "error" }),
  loading: (title: string, description?: string) => push({ title, description, tone: "loading" }),
  dismiss
};

export function Toaster() {
  const [stack, setStack] = useState<ToastItem[]>(items);

  useEffect(() => {
    const listener = (next: ToastItem[]) => setStack(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] space-y-2">
      {stack.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto w-80 rounded-2xl border bg-card p-3 shadow-sm",
            item.tone === "success" && "border-emerald-500/30",
            item.tone === "error" && "border-red-500/30",
            item.tone === "loading" && "border-[color:var(--border)]"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              {item.description ? <p className="mt-1 text-xs text-muted">{item.description}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Close toast"
              className="rounded-md px-1 text-xs text-muted hover:text-text"
              onClick={() => dismiss(item.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

