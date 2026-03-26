"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "The Team", href: "#team" },
  { label: "Trust & Safety", href: "#safety" },
  { label: "Pricing", href: "#" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center pt-4 px-4 pointer-events-none">
      {/* Aurora circles */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none overflow-hidden h-32">
        <div className="absolute top-[-40px] left-[10%]  w-48 h-48 rounded-full blur-3xl opacity-70" style={{ background: "#C8D7FF" }} />
        <div className="absolute top-[-20px] left-[30%]  w-40 h-40 rounded-full blur-3xl opacity-60" style={{ background: "#FFE1A4" }} />
        <div className="absolute top-[-30px] right-[30%] w-36 h-36 rounded-full blur-3xl opacity-50" style={{ background: "#FFE5E5" }} />
        <div className="absolute top-[-10px] right-[10%] w-44 h-44 rounded-full blur-3xl opacity-60" style={{ background: "#C3EFDA" }} />
      </div>

      {/* Pill navbar */}
      <nav className="pointer-events-auto relative flex items-center gap-6 px-5 py-2.5 rounded-full border border-white/60 shadow-lg shadow-black/5"
        style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(16px)" }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shadow-sm"
            style={{ background: "linear-gradient(135deg, #56B8FF, #018EF5)" }}>
            +
          </div>
          <span className="font-[family-name:var(--font-mono)] text-sm font-semibold" style={{ color: "#118CFD" }}>
            MediCrew
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-5">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}
              className="font-[family-name:var(--font-mono)] text-xs transition-colors"
              style={{ color: "#637288" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#12181B")}
              onMouseLeave={e => (e.currentTarget.style.color = "#637288")}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right cluster */}
        <div className="hidden md:flex items-center gap-3 ml-2">
          <Link href="/login/patient"
            className="font-[family-name:var(--font-mono)] text-xs px-3 py-1.5 rounded-full border transition-colors"
            style={{ color: "#384248", borderColor: "#D1D5DB" }}>
            Log In
          </Link>
          <Link href="/consult"
            className="font-[family-name:var(--font-mono)] text-xs px-4 py-1.5 rounded-full text-white font-medium shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(180deg, #56B8FF, #018EF5)" }}>
            Sign Up
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden ml-2" style={{ color: "#384248" }} onClick={() => setOpen(!open)}>
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="pointer-events-auto mt-2 w-72 rounded-2xl border border-white/60 shadow-xl px-5 py-5 flex flex-col gap-4"
          style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)" }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="font-[family-name:var(--font-mono)] text-sm"
              style={{ color: "#384248" }}>
              {item.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t border-black/5">
            <Link href="/login/patient"
              className="flex-1 text-center font-[family-name:var(--font-mono)] text-xs px-3 py-2 rounded-full border"
              style={{ color: "#384248", borderColor: "#D1D5DB" }}>
              Log In
            </Link>
            <Link href="/consult"
              className="flex-1 text-center font-[family-name:var(--font-mono)] text-xs px-3 py-2 rounded-full text-white font-medium"
              style={{ background: "linear-gradient(180deg, #56B8FF, #018EF5)" }}>
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
