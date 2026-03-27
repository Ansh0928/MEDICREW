import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing | MediCrew",
  description: "MediCrew pricing and access model for patients and partners.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Pricing</h1>
      <p className="mt-4 max-w-3xl text-slate-700">
        MediCrew currently offers free patient consultations while we expand our Australia-first care navigation program.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Patient Access</h2>
          <p className="mt-2 text-slate-700">Free to start, including consultation summaries and follow-up reminders.</p>
          <Link href="/consult" className="mt-4 inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700">
            Start consultation
          </Link>
        </section>
        <section className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Partner Pilot Program</h2>
          <p className="mt-2 text-slate-700">Clinics and allied health partners can run controlled pilots with onboarding support.</p>
          <Link href="/partners" className="mt-4 inline-flex rounded-full border px-4 py-2 text-sm hover:bg-slate-50">
            Contact partner team
          </Link>
        </section>
      </div>
    </main>
  );
}
