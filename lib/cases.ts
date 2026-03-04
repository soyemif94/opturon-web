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
    title: "Atención automatizada en WhatsApp (soporte y derivación)",
    summary: "Caso tipo para operaciones con alto volumen de consultas repetitivas y necesidad de escalar sin perder calidad.",
    situation:
      "El equipo respondía manualmente consultas similares todo el día, con tiempos de espera altos y poca trazabilidad de derivaciones.",
    solution:
      "Se diseñó un flujo de atención inicial con reglas de negocio, respuestas guiadas y escalamiento a humano en casos sensibles.",
    outcomeBullets: [
      "Reducción típica del tiempo de primera respuesta.",
      "Mayor consistencia en respuestas operativas.",
      "Menor carga en el equipo para tareas repetitivas."
    ],
    stackBullets: [
      "WhatsApp Business API",
      "Motor de reglas de derivación",
      "Registro estructurado de interacciones"
    ],
    relatedServiceHref: "/servicios/automatizacion-whatsapp",
    ctaLabel: "Quiero este enfoque"
  },
  {
    slug: "calificacion-leads-agenda-automatica",
    title: "Calificación de leads y agenda automática",
    summary: "Caso tipo para equipos comerciales que necesitan ordenar captación, filtrado y agenda en menos tiempo.",
    situation:
      "Los leads llegaban por distintos canales y se perdían en el seguimiento manual, afectando conversión y velocidad comercial.",
    solution:
      "Se implementó un flujo de calificación por criterios de negocio y asignación automática de agenda según disponibilidad.",
    outcomeBullets: [
      "Mejora típica en velocidad de contacto comercial.",
      "Mayor calidad de leads derivados a ventas.",
      "Menos pasos manuales para coordinar reuniones."
    ],
    stackBullets: [
      "WhatsApp + formulario de captación",
      "Calendario y agenda automatizada",
      "Reglas de priorización comercial"
    ],
    relatedServiceHref: "/servicios/automatizacion-whatsapp"
  },
  {
    slug: "integracion-whatsapp-crm-pipeline",
    title: "Integración WhatsApp + CRM + pipeline",
    summary: "Caso tipo para empresas que necesitan conectar conversación, contexto y avance comercial en un solo flujo.",
    situation:
      "La información de cada cliente estaba dispersa entre chat, CRM y planillas, generando errores y demoras operativas.",
    solution:
      "Se conectaron eventos de WhatsApp con CRM y pipeline para actualizar etapas, tareas y contexto comercial automáticamente.",
    outcomeBullets: [
      "Menos carga administrativa en el equipo.",
      "Trazabilidad de punta a punta del proceso comercial.",
      "Mejor visibilidad de conversión por etapa."
    ],
    stackBullets: [
      "CRM con pipeline",
      "Webhooks y automatización de eventos",
      "Dashboards operativos"
    ],
    relatedServiceHref: "/servicios/integraciones-crm"
  },
  {
    slug: "optimizacion-continua-metricas-operativas",
    title: "Optimización continua y métricas operativas",
    summary: "Caso tipo para operaciones que ya automatizaron y buscan sostener rendimiento con mejoras iterativas.",
    situation:
      "Los flujos funcionaban al inicio, pero perdían efectividad por cambios del negocio y falta de monitoreo continuo.",
    solution:
      "Se estableció un ciclo de medición y optimización con ajustes periódicos sobre reglas, prompts y derivaciones.",
    outcomeBullets: [
      "Mayor estabilidad de la operación automatizada.",
      "Priorización más clara de mejoras por impacto.",
      "Evolución continua basada en datos."
    ],
    stackBullets: [
      "KPIs operativos y comerciales",
      "Backlog de optimización continua",
      "Ciclos quincenales de mejora"
    ],
    relatedServiceHref: "/servicios/optimizacion-continua"
  },
  {
    slug: "landing-conversion-profesionales",
    title: "Landing de conversión para servicios profesionales",
    summary:
      "Caso tipo orientado a captación con formulario, WhatsApp, prueba social y CTA. Modelo de referencia (no corresponde a un cliente real).",
    situation:
      "Un negocio de servicios profesionales necesitaba convertir tráfico en consultas calificadas sin depender de seguimiento manual constante.",
    solution:
      "Se diseñó una landing premium con propuesta clara, bloques de confianza, formularios cortos y CTA principal a WhatsApp y contacto.",
    outcomeBullets: [
      "Mejora típica del CTR en bloques principales de acción.",
      "Reducción típica de rebote en el primer scroll.",
      "Mayor volumen típico de consultas calificadas."
    ],
    stackBullets: [
      "Next.js App Router",
      "Formulario + CTA WhatsApp",
      "SEO técnico, OG y schema",
      "Analítica para conversión"
    ],
    relatedServiceHref: "/servicios/diseno-web"
  },
  {
    slug: "institucional-corporativa-seo",
    title: "Institucional corporativa con SEO técnico y performance",
    summary:
      "Caso tipo para posicionamiento de autoridad de marca con indexación y velocidad. Modelo de referencia (no corresponde a un cliente real).",
    situation:
      "La web institucional tenía contenido desordenado, tiempos de carga altos y bajo rendimiento orgánico en páginas clave.",
    solution:
      "Se rediseñó arquitectura de información, secciones corporativas y base SEO técnica con foco en performance y claridad comercial.",
    outcomeBullets: [
      "Mejora típica en velocidad de carga en páginas críticas.",
      "Mayor capacidad típica de indexación en contenidos estratégicos.",
      "Incremento típico de interacción en secciones de valor."
    ],
    stackBullets: [
      "Next.js + rendering optimizado",
      "Sitemap, robots y metadata avanzada",
      "Open Graph y JSON-LD",
      "Integración analítica de eventos"
    ],
    relatedServiceHref: "/servicios/diseno-web"
  },
  {
    slug: "ecommerce-minimal-performance",
    title: "Ecommerce minimal optimizado para performance",
    summary:
      "Caso tipo para catálogo claro, checkout guiado y medición comercial. Modelo de referencia (no corresponde a un cliente real).",
    situation:
      "Un ecommerce con buena oferta tenía fuga en navegación de catálogo y caída de conversión en pasos previos al checkout.",
    solution:
      "Se implementó un enfoque minimal con jerarquía visual clara, ruta de compra simplificada y medición por eventos de conversión.",
    outcomeBullets: [
      "Mejora típica en navegación de catálogo a producto.",
      "Reducción típica de fricción previa al checkout.",
      "Mayor claridad típica para optimizar conversión por embudo."
    ],
    stackBullets: [
      "UI ecommerce responsive premium",
      "Eventos de embudo y conversión",
      "Performance web y SEO base",
      "Integración WhatsApp para consultas"
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
