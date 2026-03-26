"use client";

import Link from "next/link";

export function CTA() {
  return (
    <section className="bg-[#050505] py-28 px-6 border-t border-white/[0.04]">
      <div className="max-w-4xl mx-auto text-center">
        {/* Glow */}
        <div className="relative inline-block mb-10">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl scale-150 pointer-events-none" />
          <span className="relative text-5xl">+</span>
        </div>

        <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-6xl text-white leading-tight mb-6">
          Ready to meet your{" "}
          <span className="italic text-blue-300">AI care team?</span>
        </h2>
        <p className="text-white/40 text-lg mb-10 max-w-lg mx-auto">
          Free consultation. No account. No data stored. Just instant, structured health guidance.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/consult"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-medium font-[family-name:var(--font-mono)] text-sm hover:bg-blue-50 transition-all duration-200"
          >
            Start Free Consultation
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
          <Link
            href="/login/patient"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/[0.12] text-white/60 font-[family-name:var(--font-mono)] text-sm hover:border-white/25 hover:text-white transition-all duration-200"
          >
            Patient Portal
          </Link>
        </div>

        <p className="mt-8 font-[family-name:var(--font-mono)] text-[11px] text-white/20">
          AHPRA-aligned · Privacy Act 1988 · Data stored in Australia
        </p>
      </div>
    </section>
  );
}
