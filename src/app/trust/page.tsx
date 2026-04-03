import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Trust Center | MediCrew",
  description:
    "How MediCrew handles safety, privacy, emergency escalation, and clinical boundaries for Australia-first care navigation.",
};

export default function TrustPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white pt-20">
        <section className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-sm uppercase tracking-widest text-slate-500">
            Trust Center
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
            Safety, privacy, and clinical boundaries
          </h1>
          <p className="mt-4 text-base text-slate-700">
            MediCrew is an AI health navigation product. It helps you understand
            next steps, but it does not diagnose conditions or replace
            registered healthcare professionals.
          </p>
        </section>

        <section id="clinical-safety" className="mx-auto max-w-4xl px-6 pb-10">
          <h2 className="text-2xl font-semibold text-slate-900">
            Clinical safety model
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            <li>
              Emergency detection runs before any model-generated response.
            </li>
            <li>
              If urgent red flags are detected, users are directed to call 000
              first.
            </li>
            <li>
              Outputs include explicit non-diagnosis language and escalation
              guidance.
            </li>
            <li>
              Agent naming follows AHPRA-safe conventions (for example, “Alex AI
              — GP”).
            </li>
          </ul>
        </section>

        <section id="au-data" className="mx-auto max-w-4xl px-6 pb-10">
          <h2 className="text-2xl font-semibold text-slate-900">
            Data handling and Australian posture
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">
            <li>Primary storage is in Sydney (`ap-southeast-2`).</li>
            <li>
              Consent is required before health consultations are processed.
            </li>
            <li>
              Users can request export/deletion workflows consistent with
              Privacy Act obligations.
            </li>
            <li>
              Some AI processing may involve providers outside Australia where
              disclosed and consented.
            </li>
          </ul>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-16">
          <h2 className="text-2xl font-semibold text-slate-900">
            Policy links
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="rounded-full border px-4 py-2 text-sm hover:bg-slate-50"
              href="/privacy"
            >
              Privacy policy
            </Link>
            <Link
              className="rounded-full border px-4 py-2 text-sm hover:bg-slate-50"
              href="/terms"
            >
              Terms of use
            </Link>
            <Link
              className="rounded-full border px-4 py-2 text-sm hover:bg-slate-50"
              href="/cookies"
            >
              Cookie policy
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
