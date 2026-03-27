import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.medicrew.health";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/patient/", "/doctor/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
