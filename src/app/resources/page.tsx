import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { ArrowRight } from "lucide-react";

const clusters = [
  {
    slug: "chest-pain",
    title: "Chest pain and breathing concerns",
    intent: "Understand urgency and when to call 000 vs urgent GP care.",
    tags: ["Emergency-aware", "Cardio", "Respiratory"],
  },
  {
    slug: "fever-cough",
    title: "Fever, cough, and viral symptoms",
    intent: "Triage symptom progression and decide follow-up timing.",
    tags: ["Infectious disease", "Self-care", "GP timing"],
  },
  {
    slug: "mental-health",
    title: "Mental health and stress symptoms",
    intent: "Identify immediate safety steps and support pathways.",
    tags: ["Mental health", "Safety planning", "Lifeline"],
  },
  {
    slug: "skin-allergy",
    title: "Skin and allergy reactions",
    intent: "Separate routine monitoring from urgent warning signs.",
    tags: ["Dermatology", "Allergy", "Anaphylaxis"],
  },
];

export const metadata: Metadata = {
  title: "Care Resources | MediCrew",
  description:
    "Symptom-navigation resources designed for Australia-first care pathways.",
};

export default function ResourcesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen max-w-5xl px-6 pt-28 pb-16">
        <p className="font-mono text-xs tracking-widest uppercase text-slate-500 mb-4">
          Resources
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          Care Resources
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Organised by symptom-intent clusters so you can quickly understand
          urgency, next steps, and how to prepare for GP follow-up.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {clusters.map((cluster) => (
            <Link
              key={cluster.slug}
              href={`/resources/${cluster.slug}`}
              className="group rounded-xl border border-slate-200 p-5 hover:border-sky-300 hover:shadow-sm transition-all bg-white flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-sky-700 transition-colors leading-snug pr-4">
                  {cluster.title}
                </h2>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 flex-shrink-0 mt-1 transition-colors" />
              </div>
              <p className="text-sm text-slate-600">{cluster.intent}</p>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {cluster.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-sky-50 border border-sky-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-slate-900">
              Not sure which category fits?
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Start a free AI consultation and our care team will triage your
              symptoms directly.
            </p>
          </div>
          <Link
            href="/consult"
            className="rounded-full bg-sky-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-sky-700 transition-colors flex-shrink-0"
          >
            Start consultation
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
