import type { Metadata } from "next";

const clusters = [
  {
    title: "Chest pain and breathing concerns",
    intent: "Understand urgency and when to call 000 vs urgent GP care.",
  },
  {
    title: "Fever, cough, and viral symptoms",
    intent: "Triage symptom progression and decide follow-up timing.",
  },
  {
    title: "Mental health and stress symptoms",
    intent: "Identify immediate safety steps and support pathways.",
  },
  {
    title: "Skin and allergy reactions",
    intent: "Separate routine monitoring from urgent warning signs.",
  },
];

export const metadata: Metadata = {
  title: "Care Resources | MediCrew",
  description: "Symptom-navigation resources designed for Australia-first care pathways.",
};

export default function ResourcesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Care Resources</h1>
      <p className="mt-4 max-w-3xl text-slate-700">
        Our resources are organized by symptom-intent clusters so people can quickly understand urgency, next steps, and how to prepare for GP follow-up.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {clusters.map((cluster) => (
          <article key={cluster.title} className="rounded-xl border p-5">
            <h2 className="text-lg font-semibold text-slate-900">{cluster.title}</h2>
            <p className="mt-2 text-sm text-slate-700">{cluster.intent}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
