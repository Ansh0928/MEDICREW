import type { Metadata } from "next";
import { Inter, Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.medicrew.health"),
  title: {
    default: "MediCrew | AI Health Navigation Team",
    template: "%s | MediCrew",
  },
  description:
    "Australia-first AI health navigation with specialist perspectives, clear next steps, and emergency-first safety boundaries.",
  keywords: [
    "health",
    "AI",
    "healthcare",
    "symptoms",
    "triage",
    "medical guidance",
    "Australia",
  ],
  openGraph: {
    title: "MediCrew | AI Health Navigation Team",
    description:
      "Navigate symptoms with AI specialist input, safety-first escalation, and follow-up care summaries.",
    url: "https://www.medicrew.health",
    siteName: "MediCrew",
    type: "website",
    images: [
      {
        url: "/medicrew-icon.svg",
        width: 512,
        height: 512,
        alt: "MediCrew icon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MediCrew | AI Health Navigation Team",
    description:
      "AI specialist-guided health navigation designed for Australia-first care pathways.",
  },
  alternates: {
    canonical: "https://www.medicrew.health",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/medicrew-icon.svg",
    shortcut: "/medicrew-icon.svg",
    apple: "/medicrew-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en-AU" className="scroll-smooth">
        <body className={`${inter.variable} ${playfair.variable} ${ibmMono.variable} font-sans antialiased`}>
          <AuthProvider>{children}</AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
