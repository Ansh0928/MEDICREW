import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | MediCrew",
  description: "Terms governing your use of MediCrew health navigation services.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Terms of Use</h1>
      <p className="mt-4 text-slate-700">
        By using MediCrew, you agree to these terms. MediCrew provides health navigation guidance only.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">No diagnosis or emergency care</h2>
        <p className="text-slate-700">
          MediCrew does not provide medical diagnosis or treatment. For emergencies, call 000 immediately.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">User responsibilities</h2>
        <p className="text-slate-700">
          Provide accurate information, follow clinical escalation advice, and consult registered professionals for diagnosis and treatment decisions.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Service updates</h2>
        <p className="text-slate-700">We may improve, change, or discontinue parts of the service while maintaining safety and compliance obligations.</p>
      </section>
    </main>
  );
}
