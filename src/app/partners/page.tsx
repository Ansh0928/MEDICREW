import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner Program | MediCrew",
  description: "Australia-first pilot program for clinics, allied health teams, and care communities.",
};

export default function PartnersPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Partner Program</h1>
      <p className="mt-4 text-slate-700">
        We run limited pilot programs with clinics, allied health organizations, and community health groups to validate safe, measurable care-navigation workflows.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-6 text-slate-700">
        <li>Co-designed patient pathways and escalation boundaries</li>
        <li>Retention-quality KPI reporting and weekly review cadences</li>
        <li>AU-first compliance and operational support</li>
      </ul>
      <p className="mt-8 text-slate-700">
        Contact: <a className="underline" href="mailto:partners@medicrew.health">partners@medicrew.health</a>
      </p>
    </main>
  );
}
