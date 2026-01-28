import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MediCrew - Your AI Health Navigation Team",
  description:
    "Skip the wait. Get guidance from a team of AI health specialists. MediCrew brings together AI-powered GP, specialists, and triage experts to help you understand your symptoms and navigate to the right care.",
  keywords: [
    "health",
    "AI",
    "healthcare",
    "symptoms",
    "triage",
    "medical guidance",
    "Australia",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
