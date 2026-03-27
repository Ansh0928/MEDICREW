import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MediCrew",
  description: "How MediCrew collects, uses, and safeguards personal and health-related information.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Privacy Policy</h1>
      <p className="mt-4 text-slate-700">
        This policy explains how MediCrew handles your personal and health information when you use our services.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">What we collect</h2>
        <p className="text-slate-700">Account details, consultation inputs, and consent records needed to deliver health navigation and follow-up features.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">How we use data</h2>
        <p className="text-slate-700">To deliver consultation summaries, support ongoing care-team follow-ups, and improve service quality and safety monitoring.</p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Storage and processing</h2>
        <p className="text-slate-700">
          Data storage is based in Australia. Some AI model processing may occur overseas, as disclosed during consent.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Your rights</h2>
        <p className="text-slate-700">You can request access, correction, or deletion of your data. Contact: hello@medicrew.health</p>
      </section>
    </main>
  );
}
