import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://opturon.com";
  return [
    "",
    "/servicios",
    "/quienes-somos",
    "/contacto",
    "/login",
    "/bot/inbox",
    "/bot/settings",
    "/bot/metrics",
    "/bot/logs",
    "/admin"
  ].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
    lastModified: new Date()
  }));
}
