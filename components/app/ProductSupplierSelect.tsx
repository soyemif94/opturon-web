"use client";

import { useEffect, useMemo, useState } from "react";
import type { PortalSupplier } from "@/lib/api";

type SupplierOption = Pick<PortalSupplier, "id" | "displayName" | "status">;

export function ProductSupplierSelect({
  value,
  onChange,
  disabled = false,
  currentSupplierLabel,
  currentSupplierStatus,
  legacySupplierLabel
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  currentSupplierLabel?: string | null;
  currentSupplierStatus?: "active" | "inactive" | null;
  legacySupplierLabel?: string | null;
}) {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      try {
        const response = await fetch("/api/app/suppliers?pageSize=100&sort=name_asc", { cache: "no-store" });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(String(json?.error || "suppliers_load_failed"));
        if (!cancelled) {
          setSuppliers(Array.isArray(json?.items) ? json.items : []);
        }
      } catch {
        if (!cancelled) setSuppliers([]);
      }
    }

    void loadSuppliers();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const selected = suppliers.find((supplier) => supplier.id === value) || null;
    if (selected) return suppliers;
    if (value && currentSupplierLabel) {
      return [{ id: value, displayName: currentSupplierLabel, status: currentSupplierStatus || "inactive" }, ...suppliers];
    }
    return suppliers;
  }, [currentSupplierLabel, currentSupplierStatus, suppliers, value]);

  return (
    <div className="space-y-2">
      <select
        className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-bg px-3 text-sm text-text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">Sin proveedor habitual</option>
        {options.map((supplier) => {
          const isInactive = supplier.status === "inactive";
          const isSelected = supplier.id === value;
          return (
            <option key={supplier.id} value={supplier.id} disabled={isInactive && !isSelected}>
              {supplier.displayName}
              {isInactive ? " · Inactivo" : ""}
            </option>
          );
        })}
      </select>
      {legacySupplierLabel && !value ? (
        <p className="text-xs text-muted">Fallback legacy visible: {legacySupplierLabel}</p>
      ) : null}
      {currentSupplierStatus === "inactive" && value ? (
        <p className="text-xs text-amber-200">El proveedor actual está inactivo. Puedes conservarlo o reemplazarlo por uno activo.</p>
      ) : null}
    </div>
  );
}
