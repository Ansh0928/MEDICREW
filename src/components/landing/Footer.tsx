"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-black border-t border-white/[0.05] px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white/10 border border-white/15 flex items-center justify-center text-xs text-white/60">
            +
          </div>
          <span className="font-[family-name:var(--font-mono)] text-sm text-white/50">
            MediCrew
          </span>
        </div>

        <nav className="flex items-center gap-6">
          {["About", "Privacy", "Terms", "Contact"].map((label) => (
            <Link
              key={label}
              href="#"
              className="font-[family-name:var(--font-mono)] text-xs text-white/25 hover:text-white/60 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <p className="font-[family-name:var(--font-mono)] text-[11px] text-white/20 text-center md:text-right">
          © {new Date().getFullYear()} MediCrew · Health navigation, not medical advice.
        </p>
      </div>
    </footer>
  );
}
