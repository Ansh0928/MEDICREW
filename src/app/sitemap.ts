import type { MetadataRoute } from "next";

const baseUrl = "https://www.medicrew.health";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/consult",
    "/pricing",
    "/resources",
    "/trust",
    "/privacy",
    "/terms",
    "/cookies",
    "/partners",
    "/login",
    "/login/patient",
    "/login/doctor",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
