import { requirePartnerPage } from "@/lib/saas/access";

export default async function PartnersPage() {
  const ctx = await requirePartnerPage();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Partner Portal</p>
          <h1 className="text-4xl font-semibold text-white">{ctx.session?.user?.name || "Partner"}</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            La base de Partners ya esta habilitada. Esta vista queda intencionalmente minima en `PARTNERS.FOUNDATION.1A`
            para no mezclar fundacion de dominio con el rediseño del portal.
          </p>
        </div>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Partner ID</p>
              <p className="text-sm text-white">{ctx.session?.user?.partnerId || "n/a"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Scope</p>
              <p className="text-sm text-white">{ctx.session?.user?.accountScope || "partner"}</p>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            Los endpoints backend disponibles para esta identidad son `/api/partners/me`, `/summary`, `/clients`
            y `/rank-progress`, protegidos con `partnerId` server-side.
          </p>
        </section>
      </div>
    </main>
  );
}
