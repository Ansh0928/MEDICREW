"use client";

import Link from "next/link";

export function CTA() {
  return (
    <section className="py-28 px-6" style={{ background: "#E7F3FF" }}>
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8"
          style={{ background: "rgba(255,255,255,0.8)", borderColor: "#BFDBFE", color: "#637288" }}>
          <span className="text-lg" style={{ color: "#F7C543" }}>✦</span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-wider">
            Free · No Account · No Data Stored
          </span>
        </div>

        <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-6xl leading-tight mb-6"
          style={{ color: "#12181B", letterSpacing: "-2px" }}>
          Docs that set your health up for{" "}
          <span className="italic" style={{ color: "#12CA93" }}>
            •success
          </span>
        </h2>

        <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: "#384248" }}>
          Free consultation. No account. No data stored. Just instant, structured health guidance.
        </p>

        {/* Pill CTA — readme.com style */}
        <div className="inline-flex items-center gap-3 p-1.5 rounded-full border shadow-md mx-auto"
          style={{ background: "rgba(255,255,255,0.9)", borderColor: "#E5E7EB" }}>
          <Link href="/consult"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-white font-medium font-[family-name:var(--font-mono)] text-sm hover:opacity-90 transition-opacity shadow-sm"
            style={{ background: "linear-gradient(180deg, #56B8FF, #018EF5)" }}>
            Start Free Consultation →
          </Link>
          <Link href="#team"
            className="px-5 py-3 text-sm font-[family-name:var(--font-mono)] hover:opacity-70 transition-opacity"
            style={{ color: "#118CFD" }}>
            Meet the Team
          </Link>
        </div>

        <p className="mt-8 font-[family-name:var(--font-mono)] text-[11px]" style={{ color: "#637288" }}>
          AHPRA-aligned · Privacy Act 1988 · Data stored in Australia
        </p>
      </div>
    </section>
  );
}
