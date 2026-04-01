export type WebPortfolioModel = {
  id: number;
  title: string;
  idealFor: string;
  highlights: string[];
  category: "web";
};

export const webPortfolioModels: WebPortfolioModel[] = [
  {
    id: 1,
    title: "Clinica estetica - captacion por WhatsApp",
    idealFor: "Landing orientada a generar consultas directas, filtrar interes y acelerar el agendamiento desde el primer mensaje.",
    highlights: ["CTA directo a WhatsApp", "Flujo guiado para consultas", "Confianza y prueba social visibles"],
    category: "web"
  },
  {
    id: 2,
    title: "Empresa de servicios - propuesta clara y cierre comercial",
    idealFor: "Sitio pensado para ordenar oferta, mostrar valor diferencial y transformar visitas en reuniones calificadas.",
    highlights: ["Mensaje de valor directo", "Servicios ordenados por decision", "CTA a reunion o diagnostico"],
    category: "web"
  },
  {
    id: 3,
    title: "Marca ecommerce - catalogo que empuja conversion",
    idealFor: "Experiencia enfocada en reducir friccion de compra y llevar al usuario desde descubrimiento hasta checkout.",
    highlights: ["Home pensada para vender", "Producto destacado con contexto", "Camino de compra mas simple"],
    category: "web"
  },
  {
    id: 4,
    title: "Gastronomia - reservas y pedidos sin intermediarios",
    idealFor: "Landing para negocios que necesitan mover reservas, menu y pedidos directos desde movil.",
    highlights: ["Acceso rapido a reserva", "Menu visible sin friccion", "WhatsApp integrado al flujo"],
    category: "web"
  },
  {
    id: 5,
    title: "Profesional independiente - autoridad que genera consultas",
    idealFor: "Pagina diseñada para instalar confianza rapido y convertir trafico en contacto calificado.",
    highlights: ["Posicionamiento profesional claro", "Prueba social y credenciales", "CTA directo a consulta"],
    category: "web"
  },
  {
    id: 6,
    title: "Inmobiliaria - consultas mejor calificadas",
    idealFor: "Sitio para mostrar propiedades, ordenar la informacion y reducir conversaciones poco utiles.",
    highlights: ["Propiedades mejor presentadas", "Consulta guiada por interes", "Mas contexto antes del contacto"],
    category: "web"
  },
  {
    id: 7,
    title: "Fitness y wellness - convertir interes en clases",
    idealFor: "Experiencia pensada para que el usuario entienda la propuesta y avance rapido hacia una clase o sesion.",
    highlights: ["Oferta facil de entender", "Agenda y contacto visibles", "Recorrido corto hasta la accion"],
    category: "web"
  },
  {
    id: 8,
    title: "Cursos y formacion - venta con claridad",
    idealFor: "Paginas para programas y cohortes donde el objetivo es explicar bien, bajar dudas y aumentar inscripciones.",
    highlights: ["Oferta estructurada por beneficios", "Objeciones resueltas en la pagina", "CTA alineado a inscripcion"],
    category: "web"
  },
  {
    id: 9,
    title: "Agencia o estudio - conversaciones que terminan en reunion",
    idealFor: "Sitio enfocado en mostrar criterio, ordenar casos y transformar interes en reuniones comerciales.",
    highlights: ["Casos presentados con intencion", "Narrativa de valor clara", "CTA a reunion estrategica"],
    category: "web"
  }
];
