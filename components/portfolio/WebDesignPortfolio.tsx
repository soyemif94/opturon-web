"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

const TOTAL_ITEMS = 9;
const GRID_IMAGE_URL = "/portfolio/web-mockups-grid.svg";

export function WebDesignPortfolio() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const items = useMemo(() => Array.from({ length: TOTAL_ITEMS }, (_, i) => i), []);

  useEffect(() => {
    if (selectedIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedIndex]);

  const selectedPosition = useMemo(() => {
    if (selectedIndex === null) {
      return { x: 0, y: 0 };
    }
    const row = Math.floor(selectedIndex / 3);
    const col = selectedIndex % 3;
    return {
      x: col * 50,
      y: row * 50
    };
  }, [selectedIndex]);

  return (
    <>
      <div>
        <h2 className="text-3xl font-semibold md:text-4xl">Ejemplos de como estructuramos conversion</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Modelos de referencia basados en casos reales de negocio. Cada ejemplo muestra como ordenamos
          contenido, jerarquia visual y llamados a la accion para que el sitio ayude a vender mejor.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((index) => {
            const row = Math.floor(index / 3);
            const col = index % 3;
            const x = col * 50;
            const y = row * 50;

            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-[color:var(--border)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand/70 hover:shadow-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright"
                aria-label={`Abrir ejemplo ${index + 1} en modal`}
              >
                <div
                  className="h-full w-full bg-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  style={{
                    backgroundImage: `url('${GRID_IMAGE_URL}')`,
                    backgroundSize: "300% 300%",
                    backgroundPosition: `${x}% ${y}%`
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {selectedIndex !== null ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada del portfolio"
          onClick={() => setSelectedIndex(null)}
        >
          <div
            className="relative w-full max-w-6xl rounded-2xl border border-[color:var(--border)] bg-card p-3 opacity-100 transition duration-200 ease-out md:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-surface text-text transition hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright"
              aria-label="Cerrar modal de portfolio"
            >
              <X className="h-4 w-4" />
            </button>
            <div
              className="aspect-[16/10] w-full rounded-xl border border-[color:var(--border)] bg-cover opacity-100 transition-all duration-300 ease-out"
              style={{
                backgroundImage: `url('${GRID_IMAGE_URL}')`,
                backgroundSize: "300% 300%",
                backgroundPosition: `${selectedPosition.x}% ${selectedPosition.y}%`
              }}
              aria-label={`Vista ampliada del ejemplo ${selectedIndex + 1}`}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
