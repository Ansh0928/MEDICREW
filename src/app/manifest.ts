import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MediCrew",
    short_name: "MediCrew",
    description:
      "AI health navigation with specialist perspectives and follow-up care summaries.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#118CFD",
    icons: [
      {
        src: "/medicrew-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
