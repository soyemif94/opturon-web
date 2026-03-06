"use client";

import Link from "next/link";

export default function BusinessPageError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[app/business] Route error boundary triggered.", error);

  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5">
      <h1 className="text-xl font-semibold">No pudimos cargar los datos del negocio</h1>
      <p className="mt-2 text-sm text-muted">
        La vista fallo al cargar. Podes reintentar o volver al portal sin perder la sesion.
      </p>
      {error?.digest ? <p className="mt-3 text-xs text-red-200">Digest: {error.digest}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
        <Link href="/app" className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-surface">
          Volver al portal
        </Link>
      </div>
    </div>
  );
}
