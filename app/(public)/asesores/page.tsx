import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Programa de Asesores Opturon",
  description: "Conocé el programa comercial independiente de asesores Opturon."
};

export default function AdvisorsPage() {
  return (
    <main className="min-h-screen bg-[#06101d] text-white">
      <section className="relative overflow-hidden px-6 pb-20 pt-28 sm:px-10 lg:px-20">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-300">Programa de asesores</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">Convertite en Asesor/a Opturon</h1>
          <p className="mt-7 max-w-2xl text-xl leading-8 text-slate-300">Representá Opturon comercialmente, ayudá a negocios de tu zona a digitalizar su operación y generá comisiones por las operaciones que incorporás.</p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/asesores/registro" className="rounded-xl bg-orange-400 px-6 py-3 font-bold text-slate-950 hover:bg-orange-300">Quiero ser asesor/a</Link>
            <Link href="/login?callbackUrl=%2Fpartners" className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10">Ya soy asesor/a — Iniciar sesión</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3 lg:px-20">
        {[
          ["Qué hace un asesor", "Prospecta negocios, presenta Opturon, acompaña la contratación y mantiene una relación comercial clara."],
          ["Cómo se vincula la operación", "Las altas y pagos de clientes se atribuyen mediante el sistema existente del Portal del Asesor."],
          ["Cómo cobra", "El esquema se basa en comisiones y reglas vigentes visibles en el Portal del Asesor. No prometemos ingresos garantizados."],
          ["Relación comercial", "El programa funciona bajo una relación comercial independiente, con organización propia de tiempos y actividad."],
          ["Requisito fiscal", "Para operar como asesor/a y facturar tus servicios deberás contar con Monotributo y cumplir los requisitos de alta."],
          ["Proceso de alta", "Completás la solicitud, el equipo revisa la información y, si se aprueba, recibís el acceso al Portal del Asesor."]
        ].map(([title, body]) => <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-3 leading-7 text-slate-300">{body}</p></article>)}
      </section>
    </main>
  );
}
