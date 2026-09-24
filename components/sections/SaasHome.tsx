import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Headphones,
  MessageCircle,
  PackageCheck,
  RefreshCcw,
  Route,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  Warehouse
} from "lucide-react";

const flow = ["Consulta", "Cliente", "Pedido", "Stock", "Cobro", "Control"];

const capabilities = [
  {
    icon: MessageCircle,
    eyebrow: "Conversaciones",
    title: "Atendé cada canal con contexto",
    copy: "Centralizá WhatsApp e Instagram, asigná responsables y conservá el historial del cliente en una sola bandeja.",
    tags: ["Inbox compartido", "Asignaciones", "Historial"]
  },
  {
    icon: ShoppingCart,
    eyebrow: "Ventas y pedidos",
    title: "Pasá de la consulta al pedido",
    copy: "Convertí oportunidades en pedidos trazables, con productos, estados y seguimiento para todo el equipo.",
    tags: ["Pipeline", "Catálogo", "Pedidos"]
  },
  {
    icon: Warehouse,
    eyebrow: "Inventario y compras",
    title: "Coordiná lo que vendés y reponés",
    copy: "Consultá stock, registrá movimientos y ordená proveedores y recepciones dentro del mismo circuito comercial.",
    tags: ["Stock", "Proveedores", "Movimientos"]
  },
  {
    icon: BarChart3,
    eyebrow: "Control y seguimiento",
    title: "Tomá decisiones con información compartida",
    copy: "Seguí actividad, resultados, cobros y tareas pendientes sin reconstruir la operación en planillas separadas.",
    tags: ["Métricas", "Cobros", "Automatizaciones"]
  }
];

const audiences = [
  {
    icon: Boxes,
    title: "Distribuidoras",
    copy: "Para coordinar consultas, listas, pedidos, stock, reparto y cobranza con trazabilidad."
  },
  {
    icon: TrendingUp,
    title: "Comercios con volumen",
    copy: "Para ordenar canales y operaciones cuando los mensajes, productos y clientes empiezan a crecer."
  },
  {
    icon: UsersRound,
    title: "Equipos comerciales",
    copy: "Para compartir contexto, distribuir trabajo y hacer seguimiento sin depender de una sola persona."
  }
];

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">{copy}</p>
    </div>
  );
}

function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-[1240px]">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-orange-500/[0.08] blur-3xl" aria-hidden="true" />
      <div className="overflow-hidden rounded-[1.4rem] border border-white/15 bg-[#0d1623] p-1.5 shadow-[0_42px_130px_rgba(0,0,0,0.62)] sm:rounded-[1.8rem] sm:p-2.5">
        <div className="flex h-10 items-center justify-between border-b border-white/10 px-3 sm:h-12 sm:px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300 sm:text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Producto real
          </span>
        </div>
        <div className="overflow-hidden rounded-b-[1rem] sm:rounded-b-[1.25rem]">
          <Image
            src="/product/opturon-inbox-client-portal.png"
            width={1672}
            height={939}
            priority
            sizes="(max-width: 639px) 100vw, (max-width: 1279px) 94vw, 1240px"
            alt="Inbox real de Opturon con conversaciones de WhatsApp e Instagram, automatización, contexto comercial y seguimiento"
            className="h-[360px] w-full object-cover object-[48%_center] sm:h-auto sm:object-contain"
          />
        </div>
      </div>
      <figcaption className="mt-4 flex flex-col gap-1 text-center sm:flex-row sm:items-center sm:justify-center sm:gap-2">
        <span className="text-sm font-medium text-slate-200">Inbox omnicanal de Opturon</span>
        <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" aria-hidden="true" />
        <span className="text-xs text-slate-500">Conversaciones, clientes y operación en el mismo contexto</span>
      </figcaption>
    </figure>
  );
}

export function SaasHome() {
  return (
    <div className="overflow-hidden bg-[#080d14] text-white">
      <section className="relative pb-24 pt-16 sm:pt-20 lg:pb-32 lg:pt-28">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-orange-500/[0.08] blur-[120px]" />
          <div className="absolute -right-32 top-44 h-72 w-72 rounded-full bg-sky-500/[0.06] blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        </div>
        <div className="container-opt relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.08] px-3 py-1.5 text-xs font-medium text-orange-200">
              <Sparkles className="h-3.5 w-3.5" />
              Una plataforma para toda tu operación comercial
            </div>
            <h1 className="mt-7 text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.05em] sm:text-6xl lg:text-[4.4rem]">
              Vendé, organizá y controlá tu operación desde un solo lugar.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-400 sm:text-xl">
              Opturon conecta WhatsApp, Instagram, clientes, pedidos, stock y equipo para que cada conversación avance y toda la operación trabaje con el mismo contexto.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/contacto" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(249,115,22,0.22)] transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                Solicitar una demo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#producto" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
                Ver la plataforma <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs text-slate-500">
              {["Implementación acompañada", "Operación centralizada", "Escala con tu equipo"].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-orange-400" />{item}</span>
              ))}
            </div>
          </div>
          <div className="mt-14 sm:mt-16 lg:mt-20">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b111a] py-10" aria-label="Flujo comercial conectado">
        <div className="container-opt">
          <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Un flujo, de punta a punta</p>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {flow.map((item, index) => (
              <li key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-3 text-sm text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-semibold text-orange-300">{index + 1}</span>
                <span>{item}</span>
                {index < flow.length - 1 ? <ChevronRight className="ml-auto hidden h-3.5 w-3.5 text-slate-600 lg:block" /> : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="producto" className="py-24 sm:py-28 lg:py-32">
        <div className="container-opt">
          <SectionHeading eyebrow="La plataforma" title="Todo lo que pasa después de un mensaje, conectado." copy="Opturon organiza el recorrido completo: desde la primera consulta hasta el pedido, la disponibilidad, el cobro y el seguimiento." />
          <div className="mt-12 grid gap-8 rounded-[2rem] border border-white/10 bg-white/[0.025] p-4 sm:p-6 lg:grid-cols-[0.32fr_0.68fr] lg:items-center lg:gap-10 lg:p-8">
            <div className="px-2 py-3 sm:px-3 lg:py-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-400/25 bg-orange-400/[0.1] text-sm font-semibold text-orange-300">02</span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">De la conversación a la operación</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Convertí la consulta en un pedido listo para gestionar.</h3>
              <p className="mt-4 leading-7 text-slate-400">El equipo trabaja con cliente, productos, cantidades, precios, stock y cobro en la misma operación. Así, lo acordado en el Inbox continúa sin perder contexto.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Cliente y responsable', 'Catálogo y stock', 'Total y cobro'].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300">{item}</span>
                ))}
              </div>
            </div>

            <figure className="min-w-0">
              <div className="overflow-hidden rounded-[1.25rem] border border-white/15 bg-[#0d1623] p-1.5 shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:p-2">
                <div className="flex h-9 items-center justify-between border-b border-white/10 px-3 sm:h-10">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">Pedidos · Producto real</span>
                </div>
                <div className="overflow-hidden rounded-b-[0.85rem] sm:rounded-b-[1rem]">
                  <Image
                    src="/product/opturon-orders-create-order.png"
                    width={1815}
                    height={867}
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 92vw, 780px"
                    alt="Pantalla real de Opturon para crear un pedido con cliente, catálogo, stock, cantidades, cobro y resumen"
                    className="h-[310px] w-full object-cover object-[58%_center] sm:h-auto sm:object-contain"
                  />
                </div>
              </div>
              <figcaption className="mt-3 text-center text-xs text-slate-500">Pedido conectado al cliente, al catálogo y al seguimiento comercial</figcaption>
            </figure>
          </div>

          <div className="mt-6 grid gap-8 rounded-[2rem] border border-white/10 bg-white/[0.025] p-4 sm:p-6 lg:grid-cols-[0.68fr_0.32fr] lg:items-center lg:gap-10 lg:p-8">
            <div className="px-2 py-3 sm:px-3 lg:order-2 lg:py-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-400/25 bg-orange-400/[0.1] text-sm font-semibold text-orange-300">03</span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Catálogo conectado</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Trabajá con un catálogo real, conectado a la operación.</h3>
              <p className="mt-4 leading-7 text-slate-400">Productos, imágenes, precios y stock quedan disponibles en el mismo sistema que usa el equipo para conversar, vender y preparar cada pedido.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Productos reales', 'Stock visible', 'Búsqueda operativa', 'Gestión centralizada'].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300">{item}</span>
                ))}
              </div>
            </div>

            <figure className="min-w-0 lg:order-1">
              <div className="overflow-hidden rounded-[1.25rem] border border-white/15 bg-[#0d1623] p-1.5 shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:p-2">
                <div className="flex h-9 items-center justify-between border-b border-white/10 px-3 sm:h-10">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">Catálogo · Producto real</span>
                </div>
                <div className="overflow-hidden rounded-b-[0.85rem] sm:rounded-b-[1rem]">
                  <Image
                    src="/product/opturon-catalog-client-portal.png"
                    width={1672}
                    height={941}
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 92vw, 780px"
                    alt="Catálogo real de Opturon con productos, imágenes, precios, stock, estados y búsqueda operativa"
                    className="h-[320px] w-full object-cover object-[54%_center] sm:h-auto sm:object-contain"
                  />
                </div>
              </div>
              <figcaption className="mt-3 text-center text-xs text-slate-500">Productos y disponibilidad visibles para todo el circuito comercial</figcaption>
            </figure>
          </div>

          <div className="mt-6 grid gap-8 rounded-[2rem] border border-white/10 bg-white/[0.025] p-4 sm:p-6 lg:grid-cols-[0.32fr_0.68fr] lg:items-center lg:gap-10 lg:p-8">
            <div className="px-2 py-3 sm:px-3 lg:py-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-400/25 bg-orange-400/[0.1] text-sm font-semibold text-orange-300">04</span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Métricas para decidir</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Convertí la actividad del canal en visibilidad comercial.</h3>
              <p className="mt-4 leading-7 text-slate-400">Leé conversaciones, cobertura automatizada, intervención humana y tendencias del canal para seguir el rendimiento y decidir con contexto operativo.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Canal en tiempo real', 'Trabajo humano', 'Automatización visible', 'Rendimiento operativo'].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300">{item}</span>
                ))}
              </div>
            </div>

            <figure className="min-w-0">
              <div className="overflow-hidden rounded-[1.25rem] border border-white/15 bg-[#0d1623] p-1.5 shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:p-2">
                <div className="flex h-9 items-center justify-between border-b border-white/10 px-3 sm:h-10">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                    <span className="h-2 w-2 rounded-full bg-white/20" />
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">Métricas · Producto real</span>
                </div>
                <div className="overflow-hidden rounded-b-[0.85rem] sm:rounded-b-[1rem]">
                  <Image
                    src="/product/opturon-metrics-client-portal.png"
                    width={1672}
                    height={941}
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 92vw, 780px"
                    alt="Métricas reales de Opturon con conversaciones, respuestas humanas, automatización, tendencias y visibilidad comercial"
                    className="h-[320px] w-full object-cover object-[58%_center] sm:h-auto sm:object-contain"
                  />
                </div>
              </div>
              <figcaption className="mt-3 text-center text-xs text-slate-500">Canal, equipo y automatización reunidos en una lectura operativa</figcaption>
            </figure>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-orange-400/25 hover:bg-white/[0.045] sm:p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/[0.08] text-orange-300"><Icon className="h-5 w-5" /></div>
                  <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">{item.eyebrow}</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">{item.title}</h3>
                  <p className="mt-3 max-w-xl leading-7 text-slate-400">{item.copy}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {item.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-400">{tag}</span>)}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="distribuidoras" className="relative border-y border-white/10 bg-[#11100f] py-24 sm:py-28 lg:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,0.14),transparent_32%)]" aria-hidden="true" />
        <div className="container-opt relative grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionHeading eyebrow="Diseñado para distribuidoras" title="Del mensaje al reparto, sin perder el control." copy="Cuando el negocio combina catálogo, vendedores, pedidos frecuentes, stock y cobranza, cada dato aislado genera demora. Opturon une ese circuito para que el equipo trabaje sobre la misma operación." />
            <Link href="/contacto" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-orange-300 transition hover:text-orange-200">Ver Opturon para mi distribuidora <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [ClipboardCheck, "Pedidos claros", "Productos, cantidades, cliente y estado en un registro compartido."],
              [Warehouse, "Stock visible", "Disponibilidad y movimientos conectados con lo que el equipo vende."],
              [Route, "Entrega coordinada", "Seguimiento operativo desde la confirmación hasta el reparto."],
              [CircleDollarSign, "Cobranza ordenada", "Pagos y pendientes dentro del contexto comercial del cliente."],
              [RefreshCcw, "Compra recurrente", "Historial y seguimiento para sostener la relación a lo largo del tiempo."],
              [UsersRound, "Equipo alineado", "Responsables, actividad y próximos pasos visibles para todos."]
            ].map(([Icon, title, copy]) => {
              const ItemIcon = Icon as typeof ClipboardCheck;
              return (
                <article key={title as string} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <ItemIcon className="h-5 w-5 text-orange-300" />
                  <h3 className="mt-4 font-semibold text-white">{title as string}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{copy as string}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="automatizacion" className="py-24 sm:py-28 lg:py-32">
        <div className="container-opt grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading eyebrow="Automatización con criterio" title="La IA acelera. Tu equipo conserva el control." copy="Automatizá respuestas, clasificación y seguimiento cuando el flujo es claro. Cuando una conversación necesita criterio comercial, una persona puede intervenir con todo el contexto disponible." />
            <div className="mt-8 space-y-4">
              {[
                [Bot, "Automatización", "Resuelve tareas repetitivas y mantiene el seguimiento activo."],
                [Headphones, "Intervención humana", "El equipo toma la conversación sin empezar de cero."],
                [Clock3, "Continuidad", "El historial y el estado operativo acompañan cada cambio de responsable."]
              ].map(([Icon, title, copy]) => {
                const RowIcon = Icon as typeof Bot;
                return <div key={title as string} className="flex gap-4"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-orange-300"><RowIcon className="h-4 w-4" /></span><div><h3 className="font-semibold text-white">{title as string}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{copy as string}</p></div></div>;
              })}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0d1520] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div><p className="text-xs text-slate-500">Conversación activa</p><p className="mt-1 text-sm font-semibold text-white">Consulta mayorista</p></div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] text-emerald-300">Atención conectada</span>
            </div>
            <div className="space-y-3 py-6">
              <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm leading-6 text-slate-300">¿Tienen disponibilidad y precio por caja?</div>
              <div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-sm bg-orange-500/15 px-4 py-3 text-sm leading-6 text-orange-100">Sí. Encontré el producto en el catálogo y puedo ayudarte a armar el pedido.</div>
              <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-500"><UserRoundCheck className="h-4 w-4 text-orange-300" />El equipo ve cliente, catálogo y pedido en el mismo contexto.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025] py-24 sm:py-28">
        <div className="container-opt">
          <SectionHeading eyebrow="Visibilidad para decidir" title="Control operativo sin reconstruir la historia." copy="Consultá qué está pasando, dónde se frena una venta y qué necesita atención. El dato nace en la operación y queda listo para seguirlo." />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {[
              [BarChart3, "Resultados comerciales", "Conversaciones, oportunidades y pedidos vistos como un mismo recorrido."],
              [PackageCheck, "Estado operativo", "Pendientes, preparación, stock y entregas disponibles para seguimiento."],
              [CircleDollarSign, "Clientes y cobros", "Actividad comercial y situación de cada cliente en contexto."]
            ].map(([Icon, title, copy]) => {
              const CardIcon = Icon as typeof BarChart3;
              return <article key={title as string} className="rounded-2xl border border-white/10 bg-[#0a1018] p-6"><CardIcon className="h-5 w-5 text-orange-300" /><h3 className="mt-5 text-lg font-semibold">{title as string}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{copy as string}</p></article>;
            })}
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-28 lg:py-32">
        <div className="container-opt">
          <SectionHeading eyebrow="Crece con tu operación" title="Una base común para equipos que necesitan orden y velocidad." copy="Opturon se adapta al circuito comercial y operativo de cada negocio, manteniendo un mismo lugar para trabajar y medir." />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {audiences.map((item) => {
              const Icon = item.icon;
              return <article key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-7"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-300"><Icon className="h-5 w-5" /></span><h3 className="mt-6 text-xl font-semibold">{item.title}</h3><p className="mt-3 leading-7 text-slate-400">{item.copy}</p></article>;
            })}
          </div>
        </div>
      </section>

      <section className="pb-24 sm:pb-28 lg:pb-32">
        <div className="container-opt">
          <div className="relative overflow-hidden rounded-[2rem] border border-orange-400/20 bg-orange-500 px-6 py-14 text-center shadow-[0_30px_100px_rgba(249,115,22,0.2)] sm:px-10 sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.2),transparent_25%),linear-gradient(120deg,transparent,rgba(0,0,0,0.12))]" aria-hidden="true" />
            <div className="relative mx-auto max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-950/70">Conocé Opturon</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">Veamos cómo conectar tu operación.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-orange-50/85 sm:text-lg">Contanos cómo vendés, atendés y gestionás hoy. Te mostramos una implementación posible sobre tu circuito real.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/contacto" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Solicitar una demo <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/demo" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-black/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Explorar una demo</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
