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
          ? "bg-black/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-sm group-hover:bg-blue-500/20 group-hover:border-blue-400/40 transition-all duration-200">
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
              className="font-[family-name:var(--font-mono)] text-xs text-white/50 hover:text-white transition-colors duration-200 tracking-wide uppercase"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-5">
          <Link
            href="/login/patient"
            className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white/80 transition-colors"
          >
            Patient
          </Link>
          <span className="text-white/20 text-xs">·</span>
          <Link
            href="/login/doctor"
            className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white/80 transition-colors"
          >
            Doctor
          </Link>
          <Link
            href="/consult"
            className="ml-2 px-4 py-2 rounded-md bg-white text-black text-xs font-medium font-[family-name:var(--font-mono)] hover:bg-white/90 transition-colors"
          >
            Start Consultation →
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white/60 hover:text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-black/95 border-b border-white/[0.06] px-6 py-6 flex flex-col gap-5">
          {[
            { label: "How It Works", href: "#how-it-works" },
            { label: "The Team", href: "#team" },
            { label: "Trust & Safety", href: "#safety" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="font-[family-name:var(--font-mono)] text-sm text-white/60 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-3 border-t border-white/[0.06]">
            <Link href="/login/patient" className="font-[family-name:var(--font-mono)] text-sm text-white/40">Patient Login</Link>
            <Link href="/login/doctor" className="font-[family-name:var(--font-mono)] text-sm text-white/40">Doctor Login</Link>
            <Link href="/consult" className="mt-1 px-4 py-2.5 rounded-md bg-white text-black text-sm font-medium text-center">
              Start Consultation
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
