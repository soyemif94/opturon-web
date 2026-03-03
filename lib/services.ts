export type ServiceKey =
  | "automatizacion-whatsapp"
  | "integraciones-crm"
  | "bots-ia"
  | "optimizacion-continua"
  | "diseno-web";

export type ServiceContent = {
  key: ServiceKey;
  slug: string;
  title: string;
  shortDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  solves: string[];
  implements: string[];
  metrics: Array<{ value: string; label: string }>;
  faqs: Array<{ question: string; answer: string }>;
  serviceType: string;
};

export const serviceProcessSteps = [
  "Diagnostico estrategico",
  "Diseno de arquitectura",
  "Implementacion tecnica",
  "Optimizacion continua"
];

export const servicesCatalog: ServiceContent[] = [
  {
    key: "automatizacion-whatsapp",
    slug: "automatizacion-whatsapp",
    title: "Automatizacion WhatsApp",
    shortDescription: "Automatiza conversaciones, seguimiento y conversion comercial en WhatsApp Business.",
    heroTitle: "Automatizacion WhatsApp para vender y operar mejor",
    heroSubtitle:
      "Disenamos flujos inteligentes en WhatsApp Business para responder mas rapido, ordenar procesos y convertir mas.",
    solves: [
      "Demoras en respuesta comercial o de soporte.",
      "Seguimientos manuales que se pierden en la operacion diaria.",
      "Conversaciones sin estructura que frenan la conversion."
    ],
    implements: [
      "Flujos de atencion y calificacion de leads.",
      "Mensajeria automatica por estado del cliente.",
      "Derivaciones inteligentes a equipo humano.",
      "Integraciones con CRM, agenda y herramientas internas."
    ],
    metrics: [
      { value: "-60%", label: "tiempo tipico de primera respuesta" },
      { value: "+35%", label: "conversion tipica de conversaciones calificadas" },
      { value: "+20h/sem", label: "tiempo operativo tipico recuperado" }
    ],
    faqs: [
      {
        question: "Esto reemplaza a mi equipo?",
        answer: "No. Automatiza lo repetitivo y deja al equipo humano en los casos de mayor valor."
      },
      {
        question: "Se puede adaptar a mi operacion actual?",
        answer: "Si. El diseno parte de tus procesos y herramientas actuales para minimizar friccion."
      },
      {
        question: "Que necesito para empezar?",
        answer: "Acceso a tu canal de WhatsApp Business y una sesion inicial de diagnostico."
      },
      {
        question: "Cuanto tarda una implementacion inicial?",
        answer: "Depende del alcance. En el diagnostico definimos roadmap y tiempos estimados."
      }
    ],
    serviceType: "Automatizacion WhatsApp Business"
  },
  {
    key: "integraciones-crm",
    slug: "integraciones-crm",
    title: "Integraciones CRM",
    shortDescription: "Conecta WhatsApp, CRM y operacion para eliminar tareas manuales y escalar con orden.",
    heroTitle: "Integraciones CRM para una operacion conectada",
    heroSubtitle:
      "Integramos tus canales y sistemas para que la informacion fluya sola entre marketing, ventas y operaciones.",
    solves: [
      "Datos de clientes dispersos en multiples herramientas.",
      "Carga manual de informacion y errores operativos.",
      "Falta de trazabilidad entre campanas, conversaciones y cierres."
    ],
    implements: [
      "Sincronizacion entre WhatsApp y CRM.",
      "Actualizacion automatica de etapas y estados.",
      "Alertas y tareas automaticas para equipos.",
      "Integraciones con agendas, formularios y dashboards."
    ],
    metrics: [
      { value: "-45%", label: "tiempo tipico en tareas administrativas" },
      { value: "+30%", label: "velocidad tipica de seguimiento comercial" },
      { value: "+1", label: "fuente unica de verdad operativa" }
    ],
    faqs: [
      {
        question: "Trabajan con cualquier CRM?",
        answer: "Trabajamos con los principales CRMs y tambien con integraciones personalizadas."
      },
      {
        question: "Se puede hacer por etapas?",
        answer: "Si. Recomendamos un roadmap gradual para ganar impacto sin frenar operacion."
      },
      {
        question: "Que pasa si tengo sistemas legacy?",
        answer: "Evaluamos compatibilidad y definimos estrategia tecnica segun restricciones reales."
      },
      {
        question: "La integracion incluye monitoreo?",
        answer: "Si. Incluimos validaciones y ajustes para mantener estabilidad operativa."
      }
    ],
    serviceType: "Integraciones CRM y automatizacion de procesos"
  },
  {
    key: "bots-ia",
    slug: "bots-ia",
    title: "Bots IA",
    shortDescription: "Bots de IA con logica de negocio para atencion, calificacion y automatizacion real.",
    heroTitle: "Bots IA que entienden tu negocio",
    heroSubtitle:
      "Disenamos bots con reglas claras y contexto operativo para que resuelvan tareas reales, no solo respondan texto.",
    solves: [
      "Consultas repetitivas que saturan al equipo.",
      "Falta de consistencia en respuestas y derivaciones.",
      "Procesos que dependen de intervencion manual constante."
    ],
    implements: [
      "Asistentes IA para atencion inicial.",
      "Flujos de decision con estados de negocio.",
      "Escalamiento a humano en casos sensibles.",
      "Registro estructurado de interacciones para mejora continua."
    ],
    metrics: [
      { value: "24/7", label: "disponibilidad tipica de atencion inicial" },
      { value: "-50%", label: "carga tipica de consultas repetitivas" },
      { value: "+consistencia", label: "en respuestas y procesos criticos" }
    ],
    faqs: [
      {
        question: "El bot puede alucinar respuestas?",
        answer: "Disenamos guardrails y logica de negocio para minimizar errores y controlar salida."
      },
      {
        question: "Se integra con mis sistemas?",
        answer: "Si. Se puede conectar con CRM, agenda y APIs segun necesidad."
      },
      {
        question: "Como miden calidad del bot?",
        answer: "Monitoreamos resolucion, derivaciones y tiempos de respuesta para iterar."
      },
      {
        question: "Puede convivir con atencion humana?",
        answer: "Si. Esta pensado para complementar al equipo, no reemplazar criterio humano."
      }
    ],
    serviceType: "Bots IA para atencion y operacion"
  },
  {
    key: "optimizacion-continua",
    slug: "optimizacion-continua",
    title: "Optimizacion continua",
    shortDescription: "Mejora continua de automatizaciones para sostener resultados y escalar sin friccion.",
    heroTitle: "Optimizacion continua para sostener crecimiento",
    heroSubtitle:
      "No alcanza con implementar: medimos, ajustamos e iteramos para mantener impacto operativo y comercial.",
    solves: [
      "Automatizaciones que pierden rendimiento con el tiempo.",
      "Falta de metricas claras para decidir mejoras.",
      "Procesos que cambian y dejan obsoleta la implementacion inicial."
    ],
    implements: [
      "Monitoreo de KPIs operativos y comerciales.",
      "Ajustes de flujos segun datos reales.",
      "Mejoras sobre prompts, reglas y derivaciones.",
      "Roadmap evolutivo de automatizacion."
    ],
    metrics: [
      { value: "+estabilidad", label: "operativa en el mediano plazo" },
      { value: "+eficiencia", label: "en procesos criticos del negocio" },
      { value: "+claridad", label: "sobre que optimizar y cuando" }
    ],
    faqs: [
      {
        question: "Cada cuanto se optimiza?",
        answer: "Depende del volumen y objetivos, normalmente en ciclos quincenales o mensuales."
      },
      {
        question: "Que metricas priorizan?",
        answer: "Tiempo de respuesta, tasa de conversion, desvios y carga operativa."
      },
      {
        question: "Incluye soporte ante cambios internos?",
        answer: "Si. Ajustamos la arquitectura cuando cambian procesos o herramientas."
      },
      {
        question: "Que pasa despues del diagnostico?",
        answer: "Definimos un plan de ejecucion y mejora continua segun prioridad de impacto."
      }
    ],
    serviceType: "Optimizacion continua de automatizaciones"
  },
  {
    key: "diseno-web",
    slug: "diseno-web",
    title: "Diseño Web Premium",
    shortDescription: "Sitios rápidos, modernos y orientados a conversión.",
    heroTitle: "Diseño Web Premium orientado a conversión",
    heroSubtitle:
      "Landing, institucional, ecommerce o portfolio - rápido, moderno y listo para escalar.",
    solves: [
      "Sitios lentos que no convierten visitas en oportunidades.",
      "Experiencias visuales desactualizadas que restan confianza.",
      "Falta de estructura SEO y técnica para crecer orgánico."
    ],
    implements: [
      "Diseño UI premium alineado a marca y conversión.",
      "Desarrollo responsive optimizado para performance.",
      "SEO técnico base y estructura de contenidos.",
      "Integraciones de formulario, analítica y canales comerciales."
    ],
    metrics: [
      { value: "-40%", label: "rebote típico en landings optimizadas" },
      { value: "+25%", label: "conversión típica de formularios" },
      { value: "<2.5s", label: "objetivo de carga en paginas criticas" }
    ],
    faqs: [
      {
        question: "Trabajan solo diseño o también desarrollo?",
        answer: "Hacemos diseño y desarrollo end-to-end para asegurar calidad de implementación."
      },
      {
        question: "Puedo migrar mi sitio actual?",
        answer: "Sí. Evaluamos la base actual y definimos migración por etapas según riesgo e impacto."
      },
      {
        question: "Incluye SEO?",
        answer: "Incluye base SEO técnica y estructura de contenidos para posicionar mejor."
      },
      {
        question: "Cuánto tarda un sitio premium?",
        answer: "Depende del alcance. En diagnóstico definimos roadmap y tiempos estimados."
      }
    ],
    serviceType: "Diseño y desarrollo web"
  }
];

export function getServiceBySlug(slug: string) {
  return servicesCatalog.find((service) => service.slug === slug) || null;
}

export function getServiceBySlugOrThrow(slug: string) {
  const service = getServiceBySlug(slug);
  if (!service) {
    throw new Error(`Service not found: ${slug}`);
  }
  return service;
}
