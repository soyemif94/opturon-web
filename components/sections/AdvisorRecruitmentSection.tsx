import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Check, Handshake, MonitorPlay, Route, WalletCards } from "lucide-react";

const steps = [
  { icon: Route, title: "Te registrás", body: "Completás tus datos y el alta al programa." },
  { icon: MonitorPlay, title: "Conocés Opturon", body: "Accedés al material y aprendés a mostrar el producto." },
  { icon: Handshake, title: "Conseguís clientes", body: "Visitás negocios, presentás la solución y acompañás la contratación." },
  { icon: WalletCards, title: "Cobrás tus comisiones", body: "Las operaciones vinculadas a tu cuenta se registran en tu Portal de Asesor." }
];

const responsibilities = [
  "Buscar y contactar comercios o empresas potenciales.",
  "Coordinar reuniones, mostrar Opturon y realizar demos.",
  "Ayudar a cada negocio a identificar el plan que mejor se adapta.",
  "Acompañar la contratación y vincularla a tu actividad comercial."
];

export function AdvisorRecruitmentSection() {
  return (
    <section id="asesores" className="relative isolate overflow-hidden border-y border-white/10 bg-[#07111f] py-24 text-white sm:py-28" aria-labelledby="advisor-title">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-40 top-20 h-[34rem] w-[34rem] rounded-full border border-orange-300/15 shadow-[0_0_120px_rgba(249,115,22,0.12)]" />
        <div className="absolute -right-56 -top-32 h-[30rem] w-[52rem] rotate-[18deg] rounded-[50%] border border-sky-300/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,0.12),transparent_30%),radial-gradient(circle_at_80%_35%,rgba(14,165,233,0.14),transparent_34%)]" />
      </div>
      <div className="container-opt relative">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-300">Asesores Opturon</p>
            <h2 id="advisor-title" className="mt-5 max-w-xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">¿Querés trabajar con nosotros?</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Convertite en asesor/a comercial de Opturon y ayudá a negocios de tu zona a ordenar, automatizar y hacer crecer su operación.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?callbackUrl=%2Fpartners" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200">Quiero ser asesor/a <ArrowRight className="h-4 w-4" /></Link>
              <a href="#asesores-pasos" className="inline-flex min-h-12 items-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">Conocer el programa</a>
            </div>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-slate-300">
              <p className="font-semibold text-white">Una relación comercial independiente</p>
              <p className="mt-2">Trabajás de forma independiente, organizás tu actividad comercial y cobrás comisiones por las operaciones que generás.</p>
              <p className="mt-2 text-slate-400">Para operar como asesor/a deberás contar con Monotributo y cumplir los requisitos de alta del programa. Las condiciones detalladas se aceptan por separado durante el onboarding.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_20px_70px_rgba(2,8,23,0.28)] sm:col-span-2"><div className="flex items-center gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-300/15 text-sky-200"><BriefcaseBusiness className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-white">Tu actividad, tu ritmo</p><p className="text-sm text-slate-400">Vendé un producto SaaS real con acompañamiento y un Portal de Asesor.</p></div></div><ul className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">{responsibilities.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />{item}</li>)}</ul></div>
            <div id="asesores-pasos" className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Cómo funciona</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{steps.map(({ icon: Icon, title, body }, index) => <div key={title} className="rounded-2xl border border-white/10 bg-[#0b1627]/85 p-5"><div className="flex items-center gap-3"><span className="text-xs font-bold text-orange-300">0{index + 1}</span><Icon className="h-5 w-5 text-sky-300" /><p className="font-semibold text-white">{title}</p></div><p className="mt-3 text-sm leading-6 text-slate-400">{body}</p></div>)}</div></div>
            <div className="rounded-2xl border border-orange-300/15 bg-orange-300/[0.06] p-5 text-sm leading-6 text-slate-300 sm:col-span-2"><p className="font-semibold text-white">Beneficios del programa</p><p className="mt-2">Manejá tus tiempos, accedé a seguimiento de clientes y comisiones, y construí tu crecimiento dentro de la red comercial.</p><p className="mt-2 text-slate-400">Comisiones por nuevas altas y continuidad de clientes. Los beneficios pueden mejorar según tu desarrollo dentro del programa.</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
