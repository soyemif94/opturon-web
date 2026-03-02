import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/"], disallow: ["/bot", "/admin"] }],
    sitemap: "https://opturon.com/sitemap.xml"
  };
}
