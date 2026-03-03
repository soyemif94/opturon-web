export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
  tags: string[];
  content: string[];
  relatedServiceHref?: string;
};

export const blogCatalog: BlogPost[] = [
  {
    slug: "automatizacion-whatsapp-arquitectura-flujos-metricas",
    title: "Automatizacion de WhatsApp para atencion: arquitectura, flujos y metricas",
    excerpt:
      "Base tecnica para disenar flujos de atencion automatizada en WhatsApp con control operativo y foco en conversion.",
    date: "2026-03-02",
    readingTime: "6 min",
    tags: ["WhatsApp", "Automatizacion", "Metricas"],
    content: [
      "## Por que arquitectura antes que respuestas",
      "Automatizar atencion en WhatsApp no es solo responder mensajes. El mayor impacto aparece cuando se define una arquitectura de estados, reglas de derivacion y trazabilidad.",
      "## Flujos minimos recomendados",
      "Un flujo base suele incluir deteccion de intencion, recopilacion de datos clave, validaciones, acciones automaticas y escalamiento humano.",
      "## Que medir desde el dia uno",
      "Tiempo de primera respuesta, tasa de derivacion, resolucion en primer contacto y conversion por etapa son metricas iniciales utiles para iterar.",
      "## Cierre",
      "La automatizacion efectiva combina velocidad, control y contexto. Sin eso, solo se traslada el caos a otro canal."
    ],
    relatedServiceHref: "/servicios/automatizacion-whatsapp"
  },
  {
    slug: "integracion-whatsapp-crm-eventos-conversion",
    title: "Integracion WhatsApp + CRM: que eventos guardar y como medir conversion",
    excerpt:
      "Guia practica para conectar eventos de WhatsApp con CRM y construir un pipeline que permita medir conversion real.",
    date: "2026-03-02",
    readingTime: "7 min",
    tags: ["CRM", "Integraciones", "Conversion"],
    content: [
      "## Eventos criticos que no pueden faltar",
      "Inicio de conversacion, calificacion, cambio de etapa, agendamiento y cierre son eventos minimos para comprender rendimiento comercial.",
      "## Estandarizar campos evita deuda operativa",
      "Definir naming y tipos de datos desde el inicio reduce errores, simplifica reporting y acelera mejoras futuras.",
      "## Conversion sin trazabilidad no existe",
      "La conversion real requiere unir fuente de lead, conversacion, acciones comerciales y resultado final.",
      "## Cierre",
      "Integrar bien no es mover datos: es alinear negocio, proceso y tecnologia en un mismo modelo de trabajo."
    ],
    relatedServiceHref: "/servicios/integraciones-crm"
  },
  {
    slug: "bots-ia-utiles-limites-buenas-practicas",
    title: "Bots con IA utiles: limites, buenas practicas y como evitar respuestas vacias",
    excerpt:
      "Criterios tecnicos para construir bots de IA que aporten valor real, con guardrails y calidad operativa.",
    date: "2026-03-02",
    readingTime: "8 min",
    tags: ["Bots IA", "Guardrails", "Operacion"],
    content: [
      "## Lo que un bot no debe hacer",
      "No deberia inventar datos, prometer acciones fuera de sistema o responder sin contexto operativo.",
      "## Buenas practicas de diseno",
      "Combinar instrucciones claras, estados de negocio y validaciones explicitas mejora consistencia y reduce errores.",
      "## Escalar a humano sigue siendo clave",
      "Los casos ambiguos, sensibles o de alto riesgo deben pasar a equipo humano con contexto previo.",
      "## Cierre",
      "Un bot util no es el que mas habla, sino el que resuelve mejor dentro de limites bien definidos."
    ],
    relatedServiceHref: "/servicios/bots-ia"
  },
  {
    slug: "automatizacion-whatsapp-atencion",
    title: "Automatizacion de WhatsApp para atencion: arquitectura, flujos y metricas",
    excerpt: "Como estructurar atencion automatizada con flujos inteligentes y metricas claras.",
    date: "2026-03-02",
    readingTime: "7 min",
    tags: ["WhatsApp", "Automatizacion", "Metricas"],
    content: [
      "## Punto de partida: arquitectura antes que automatizacion",
      "Una operacion de atencion por WhatsApp mejora cuando el flujo se disena como sistema y no como respuestas sueltas.",
      "- Deteccion de intencion inicial y contexto del contacto.",
      "- Recoleccion guiada de datos operativos utiles.",
      "## Flujos que escalan sin perder calidad",
      "La clave es definir estados, salidas permitidas y criterios de corte para evitar conversaciones interminables.",
      "- Reglas claras de derivacion a equipo humano.",
      "- Registro de eventos para trazabilidad completa.",
      "- Tiempo de primera respuesta.",
      "- Tasa de resolucion en primer contacto."
    ],
    relatedServiceHref: "/servicios/automatizacion-whatsapp"
  },
  {
    slug: "landing-que-convierte",
    title: "Como disenar una landing que convierte: estructura, copy y CTAs",
    excerpt: "La estructura real detras de una landing que convierte visitas en oportunidades.",
    date: "2026-03-02",
    readingTime: "6 min",
    tags: ["Diseno Web", "Conversion", "UX"],
    content: [
      "## Estructura de alto impacto en primer scroll",
      "Una landing de conversion empieza por una propuesta clara, un beneficio concreto y un CTA visible sin friccion.",
      "- Hero con promesa especifica y CTA primario.",
      "- Prueba de confianza con enfoque en proceso y claridad.",
      "## Copy orientado a decision",
      "El copy debe reducir dudas, explicar valor rapido y guiar a la accion con verbos concretos.",
      "- Seccion de servicio enfocada en resultado, no en features.",
      "- CTA repetido en puntos de alta intencion.",
      "- Titulos genericos sin diferenciacion real.",
      "- Formularios largos en primer contacto."
    ],
    relatedServiceHref: "/servicios/diseno-web"
  },
  {
    slug: "seo-tecnico-nextjs",
    title: "SEO tecnico en Next.js: metadata, OpenGraph, sitemap y schema",
    excerpt: "Checklist tecnico para indexar correctamente y mejorar performance.",
    date: "2026-03-02",
    readingTime: "8 min",
    tags: ["SEO", "Next.js", "Performance"],
    content: [
      "## Base tecnica para indexacion estable",
      "En Next.js, una base SEO solida combina metadata por ruta, URLs limpias y coherencia entre contenido y estructura.",
      "- Metadata especifica por pagina con title y description unicos.",
      "- OpenGraph y Twitter cards con imagen consistente.",
      "## Datos estructurados que mejoran contexto",
      "Schema bien implementado ayuda a los buscadores a interpretar servicios, pagina y contenido con mas precision.",
      "- Canonical definido para evitar duplicacion.",
      "- Robots y sitemap actualizados automaticamente.",
      "- Usar JSON-LD por tipo de pagina (Service, BlogPosting, CollectionPage).",
      "- Mantener consistencia de @id para Organization y WebSite."
    ],
    relatedServiceHref: "/servicios/diseno-web"
  }
];

export const blogPosts = blogCatalog;

export function getPostBySlug(slug: string) {
  return blogCatalog.find((post) => post.slug === slug) || null;
}

export function getPostBySlugOrThrow(slug: string) {
  const post = getPostBySlug(slug);
  if (!post) {
    throw new Error(`Blog post not found: ${slug}`);
  }
  return post;
}
