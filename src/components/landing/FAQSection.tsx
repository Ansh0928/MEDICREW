"use client";

const faqs = [
  {
    q: "Is MediCrew giving me a diagnosis?",
    a: "No. MediCrew provides health navigation guidance only. Diagnosis and treatment must come from registered healthcare professionals.",
  },
  {
    q: "When should I call 000?",
    a: "If symptoms are severe, sudden, or worsening (for example chest pain, trouble breathing, collapse, stroke signs), call 000 immediately.",
  },
  {
    q: "Do I need an account?",
    a: "You can start quickly, and signing in is required to save consultation summaries and receive follow-up reminders in your portal.",
  },
  {
    q: "Where is my data stored?",
    a: "Core data is stored in Australia (Sydney region). Some AI processing may involve providers outside Australia based on your consent settings.",
  },
  {
    q: "Can I share my result with my GP or family?",
    a: "Yes. Consultation summaries are designed to be shareable so you can prepare for appointments and keep carers informed.",
  },
  {
    q: "How long does a consultation take?",
    a: "Most sessions complete within a few minutes depending on symptom complexity and whether emergency escalation is needed.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-24 px-6" style={{ background: "#ffffff" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4" style={{ color: "#637288" }}>
            Frequently Asked Questions
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight" style={{ color: "#12181B", letterSpacing: "-1px" }}>
            Answers before you start.
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border p-5"
              style={{ borderColor: "#E5E7EB", background: "#FAFAFA" }}
            >
              <summary className="cursor-pointer list-none font-medium" style={{ color: "#12181B" }}>
                <span className="inline-flex items-start justify-between w-full gap-3">
                  <span>{item.q}</span>
                  <span style={{ color: "#64748B" }}>+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#637288" }}>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
