export type CaseItem = {
  slug: string;
  title: string;
  summary: string;
  situation: string;
  solution: string;
  outcomeBullets: string[];
  stackBullets: string[];
  relatedServiceHref: string;
  ctaLabel?: string;
};

export const casesCatalog: CaseItem[] = [
  {
    slug: "atencion-automatizada-whatsapp-soporte-derivacion",
    title: "Atencion automatizada en WhatsApp (soporte y derivacion)",
    summary: "Caso tipo para operaciones con alto volumen de consultas repetitivas y necesidad de escalar sin perder calidad.",
    situation:
      "El equipo respondia manualmente consultas similares todo el dia, con tiempos de espera altos y poca trazabilidad de derivaciones.",
    solution:
      "Se diseno un flujo de atencion inicial con reglas de negocio, respuestas guiadas y escalamiento a humano en casos sensibles.",
    outcomeBullets: [
      "Reduccion tipica del tiempo de primera respuesta.",
      "Mayor consistencia en respuestas operativas.",
      "Menor carga en el equipo para tareas repetitivas."
    ],
    stackBullets: [
      "WhatsApp Business API",
      "Motor de reglas de derivacion",
      "Registro estructurado de interacciones"
    ],
    relatedServiceHref: "/servicios/automatizacion-whatsapp",
    ctaLabel: "Quiero este enfoque"
  },
  {
    slug: "calificacion-leads-agenda-automatica",
    title: "Calificacion de leads y agenda automatica",
    summary: "Caso tipo para equipos comerciales que necesitan ordenar captacion, filtrado y agenda en menos tiempo.",
    situation:
      "Los leads llegaban por distintos canales y se perdian en el seguimiento manual, afectando conversion y velocidad comercial.",
    solution:
      "Se implemento un flujo de calificacion por criterios de negocio y asignacion automatica de agenda segun disponibilidad.",
    outcomeBullets: [
      "Mejora tipica en velocidad de contacto comercial.",
      "Mayor calidad de leads derivados a ventas.",
      "Menos pasos manuales para coordinar reuniones."
    ],
    stackBullets: [
      "WhatsApp + formulario de captacion",
      "Calendario y agenda automatizada",
      "Reglas de priorizacion comercial"
    ],
    relatedServiceHref: "/servicios/automatizacion-whatsapp"
  },
  {
    slug: "integracion-whatsapp-crm-pipeline",
    title: "Integracion WhatsApp + CRM + pipeline",
    summary: "Caso tipo para empresas que necesitan conectar conversacion, contexto y avance comercial en un solo flujo.",
    situation:
      "La informacion de cada cliente estaba dispersa entre chat, CRM y planillas, generando errores y demoras operativas.",
    solution:
      "Se conectaron eventos de WhatsApp con CRM y pipeline para actualizar etapas, tareas y contexto comercial automaticamente.",
    outcomeBullets: [
      "Menos carga administrativa en el equipo.",
      "Trazabilidad de punta a punta del proceso comercial.",
      "Mejor visibilidad de conversion por etapa."
    ],
    stackBullets: [
      "CRM con pipeline",
      "Webhooks y automatizacion de eventos",
      "Dashboards operativos"
    ],
    relatedServiceHref: "/servicios/integraciones-crm"
  },
  {
    slug: "optimizacion-continua-metricas-operativas",
    title: "Optimizacion continua y metricas operativas",
    summary: "Caso tipo para operaciones que ya automatizaron y buscan sostener rendimiento con mejoras iterativas.",
    situation:
      "Los flujos funcionaban al inicio, pero perdian efectividad por cambios del negocio y falta de monitoreo continuo.",
    solution:
      "Se establecio un ciclo de medicion y optimizacion con ajustes periodicos sobre reglas, prompts y derivaciones.",
    outcomeBullets: [
      "Mayor estabilidad de la operacion automatizada.",
      "Priorizacion mas clara de mejoras por impacto.",
      "Evolucion continua basada en datos."
    ],
    stackBullets: [
      "KPIs operativos y comerciales",
      "Backlog de optimizacion continua",
      "Ciclos quincenales de mejora"
    ],
    relatedServiceHref: "/servicios/optimizacion-continua"
  },
  {
    slug: "landing-conversion-profesionales",
    title: "Landing de conversion para servicios profesionales",
    summary:
      "Caso tipo orientado a captacion con formulario, WhatsApp, prueba social y CTA. Modelo de referencia (no corresponde a un cliente real).",
    situation:
      "Un negocio de servicios profesionales necesitaba convertir trafico en consultas calificadas sin depender de seguimiento manual constante.",
    solution:
      "Se diseno una landing premium con propuesta clara, bloques de confianza, formularios cortos y CTA principal a WhatsApp y contacto.",
    outcomeBullets: [
      "Mejora tipica del CTR en bloques principales de accion.",
      "Reduccion tipica de rebote en el primer scroll.",
      "Mayor volumen tipico de consultas calificadas."
    ],
    stackBullets: [
      "Next.js App Router",
      "Formulario + CTA WhatsApp",
      "SEO tecnico, OG y schema",
      "Analitica para conversion"
    ],
    relatedServiceHref: "/servicios/diseno-web"
  },
  {
    slug: "institucional-corporativa-seo",
    title: "Institucional corporativa con SEO tecnico y performance",
    summary:
      "Caso tipo para posicionamiento de autoridad de marca con indexacion y velocidad. Modelo de referencia (no corresponde a un cliente real).",
    situation:
      "La web institucional tenia contenido desordenado, tiempos de carga altos y bajo rendimiento organico en paginas clave.",
    solution:
      "Se rediseño arquitectura de informacion, secciones corporativas y base SEO tecnica con foco en performance y claridad comercial.",
    outcomeBullets: [
      "Mejora tipica en velocidad de carga en paginas criticas.",
      "Mayor capacidad tipica de indexacion en contenidos estrategicos.",
      "Incremento tipico de interaccion en secciones de valor."
    ],
    stackBullets: [
      "Next.js + rendering optimizado",
      "Sitemap, robots y metadata avanzada",
      "Open Graph y JSON-LD",
      "Integracion analitica de eventos"
    ],
    relatedServiceHref: "/servicios/diseno-web"
  },
  {
    slug: "ecommerce-minimal-performance",
    title: "Ecommerce minimal optimizado para performance",
    summary:
      "Caso tipo para catalogo claro, checkout guiado y medicion comercial. Modelo de referencia (no corresponde a un cliente real).",
    situation:
      "Un ecommerce con buena oferta tenia fuga en navegacion de catalogo y caida de conversion en pasos previos al checkout.",
    solution:
      "Se implemento un enfoque minimal con jerarquia visual clara, ruta de compra simplificada y medicion por eventos de conversion.",
    outcomeBullets: [
      "Mejora tipica en navegacion de catalogo a producto.",
      "Reduccion tipica de friccion previa al checkout.",
      "Mayor claridad tipica para optimizar conversion por embudo."
    ],
    stackBullets: [
      "UI ecommerce responsive premium",
      "Eventos de embudo y conversion",
      "Performance web y SEO base",
      "Integracion WhatsApp para consultas"
    ],
    relatedServiceHref: "/servicios/diseno-web"
  }
];

export function getCaseBySlug(slug: string) {
  return casesCatalog.find((item) => item.slug === slug) || null;
}

export function getCaseBySlugOrThrow(slug: string) {
  const item = getCaseBySlug(slug);
  if (!item) {
    throw new Error(`Case not found: ${slug}`);
  }
  return item;
}
