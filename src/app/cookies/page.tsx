import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | MediCrew",
  description: "How MediCrew uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Cookie Policy</h1>
      <p className="mt-4 text-slate-700">
        MediCrew uses essential cookies for authentication, security, and session continuity.
      </p>
      <p className="mt-4 text-slate-700">
        We also use event telemetry to improve onboarding, consultation completion, and return-visit experiences.
      </p>
    </main>
  );
}
