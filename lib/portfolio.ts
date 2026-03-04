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
    title: "Landing SaaS",
    idealFor: "Startups y productos digitales que necesitan captar demos o leads calificados.",
    highlights: ["Hero con CTA fuerte", "Sección servicios + prueba social", "Performance y SEO base"],
    category: "web"
  },
  {
    id: 2,
    title: "Institucional Corporativa",
    idealFor: "Empresas que necesitan presencia premium y mensaje claro de propuesta de valor.",
    highlights: ["Arquitectura de contenido clara", "Responsive premium", "Integraciones (WhatsApp / formulario / analítica)"],
    category: "web"
  },
  {
    id: 3,
    title: "Ecommerce Minimal",
    idealFor: "Marcas que priorizan conversión, catálogo ordenado y experiencia de compra limpia.",
    highlights: ["Home orientada a conversión", "Ficha de producto optimizada", "Performance y SEO base"],
    category: "web"
  },
  {
    id: 4,
    title: "Restó / Gastronomía",
    idealFor: "Negocios gastronómicos con foco en reservas, menú y pedidos directos.",
    highlights: ["Hero con CTA fuerte", "Integraciones (WhatsApp / formulario / analítica)", "Responsive premium"],
    category: "web"
  },
  {
    id: 5,
    title: "Profesional (abogado/médico)",
    idealFor: "Profesionales independientes que buscan confianza, autoridad y contacto rápido.",
    highlights: ["Sección servicios + prueba social", "Hero con CTA fuerte", "Performance y SEO base"],
    category: "web"
  },
  {
    id: 6,
    title: "Inmobiliaria / Alquileres",
    idealFor: "Equipos que necesitan mostrar propiedades y acelerar consultas calificadas.",
    highlights: ["Catálogo visual claro", "Integraciones (WhatsApp / formulario / analítica)", "Responsive premium"],
    category: "web"
  },
  {
    id: 7,
    title: "Fitness / Wellness",
    idealFor: "Estudios y marcas wellness que quieren convertir tráfico en clases o sesiones.",
    highlights: ["Hero con CTA fuerte", "Agenda y contacto visibles", "Performance y SEO base"],
    category: "web"
  },
  {
    id: 8,
    title: "Educación / Cursos",
    idealFor: "Academias y creadores que venden programas, membresías o cohortes.",
    highlights: ["Sección servicios + prueba social", "Responsive premium", "Integraciones (WhatsApp / formulario / analítica)"],
    category: "web"
  },
  {
    id: 9,
    title: "Agencia Creativa",
    idealFor: "Agencias que necesitan posicionar expertise y convertir visitas en reuniones.",
    highlights: ["Portfolio con narrativa visual", "Hero con CTA fuerte", "Performance y SEO base"],
    category: "web"
  }
];
