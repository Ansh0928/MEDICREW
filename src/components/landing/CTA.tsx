"use client";

import Link from "next/link";

export function CTA() {
  return (
    <section className="relative py-28 px-6 overflow-hidden border-t border-white/[0.04]" style={{ background: "#060614" }}>
      {/* Gradient mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[120px]" style={{ background: "rgba(124,58,237,0.3)" }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full blur-[100px]" style={{ background: "rgba(236,72,153,0.2)" }} />
        <div className="absolute inset-0 dot-grid opacity-20" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 font-[family-name:var(--font-mono)] text-[11px] text-violet-300 tracking-wider uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Free · No Account · No Data Stored
        </div>

        <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-6xl text-white leading-tight mb-6">
          Ready to meet your{" "}
          <span className="italic" style={{ background: "linear-gradient(135deg, #a78bfa, #f472b6, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            AI care team?
          </span>
        </h2>
        <p className="text-white/40 text-lg mb-10 max-w-lg mx-auto">
          Free consultation. No account. No data stored. Just instant, structured health guidance.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/consult"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-medium font-[family-name:var(--font-mono)] text-sm hover:opacity-90 transition-all duration-200 shadow-xl"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 20px 40px rgba(124,58,237,0.4)" }}
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
