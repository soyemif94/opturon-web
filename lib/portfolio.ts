export type WebPortfolioModel = {
  id: number;
  title: string;
  subtitle: string;
  highlights: string[];
  category: "web";
};

export const webPortfolioModels: WebPortfolioModel[] = [
  {
    id: 1,
    title: "Clinica estetica",
    subtitle: "Captacion por WhatsApp",
    highlights: ["Landing enfocada en consulta rapida", "CTA directo a conversacion", "Seguimiento automatizado"],
    category: "web"
  },
  {
    id: 2,
    title: "Empresa de servicios",
    subtitle: "Propuesta clara y cierre comercial",
    highlights: ["Oferta ordenada para decidir mejor", "CTA a reunion o diagnostico", "Contenido pensado para calificar interes"],
    category: "web"
  },
  {
    id: 3,
    title: "Marca ecommerce",
    subtitle: "Catalogo que empuja conversion",
    highlights: ["Home pensada para vender", "Producto presentado con contexto", "Camino de compra mas simple"],
    category: "web"
  },
  {
    id: 4,
    title: "Gastronomia",
    subtitle: "Reservas y pedidos sin intermediarios",
    highlights: ["Acceso rapido a reserva", "Menu visible sin friccion", "WhatsApp integrado al flujo"],
    category: "web"
  },
  {
    id: 5,
    title: "Profesional independiente",
    subtitle: "Autoridad que genera consultas",
    highlights: ["Posicionamiento profesional claro", "Prueba social y credenciales", "CTA directo a consulta"],
    category: "web"
  },
  {
    id: 6,
    title: "Inmobiliaria",
    subtitle: "Consultas mejor calificadas",
    highlights: ["Propiedades mejor presentadas", "Consulta guiada por interes", "Mas contexto antes del contacto"],
    category: "web"
  },
  {
    id: 7,
    title: "Fitness y wellness",
    subtitle: "Convertir interes en clases",
    highlights: ["Oferta facil de entender", "Agenda y contacto visibles", "Recorrido corto hasta la accion"],
    category: "web"
  },
  {
    id: 8,
    title: "Cursos y formacion",
    subtitle: "Venta con claridad",
    highlights: ["Oferta estructurada por beneficios", "Objeciones resueltas en la pagina", "CTA alineado a inscripcion"],
    category: "web"
  },
  {
    id: 9,
    title: "Agencia o estudio",
    subtitle: "Conversaciones que terminan en reunion",
    highlights: ["Casos presentados con intencion", "Narrativa de valor clara", "CTA a reunion estrategica"],
    category: "web"
  }
];
