"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#060614]/90 backdrop-blur-xl border-b border-violet-500/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm text-white font-bold transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            +
          </div>
          <span className="font-[family-name:var(--font-mono)] text-sm font-medium text-white tracking-tight">
            MediCrew
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "How It Works", href: "#how-it-works" },
            { label: "The Team", href: "#team" },
            { label: "Trust & Safety", href: "#safety" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white/80 transition-colors duration-200 tracking-wide uppercase"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-5">
          <Link href="/login/patient" className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white/70 transition-colors">
            Patient
          </Link>
          <span className="text-white/20 text-xs">·</span>
          <Link href="/login/doctor" className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white/70 transition-colors">
            Doctor
          </Link>
          <Link
            href="/consult"
            className="ml-2 px-4 py-2 rounded-lg text-white text-xs font-medium font-[family-name:var(--font-mono)] hover:opacity-90 transition-opacity shadow-lg shadow-violet-900/30"
            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
          >
            Start Free →
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white/60 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#060614]/95 backdrop-blur-xl border-b border-violet-500/10 px-6 py-6 flex flex-col gap-5">
          {[
            { label: "How It Works", href: "#how-it-works" },
            { label: "The Team", href: "#team" },
            { label: "Trust & Safety", href: "#safety" },
          ].map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="font-[family-name:var(--font-mono)] text-sm text-white/60 hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-3 border-t border-white/[0.06]">
            <Link href="/login/patient" className="font-[family-name:var(--font-mono)] text-sm text-white/40">Patient Login</Link>
            <Link href="/login/doctor" className="font-[family-name:var(--font-mono)] text-sm text-white/40">Doctor Login</Link>
            <Link href="/consult" className="mt-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium text-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
              Start Free Consultation
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
