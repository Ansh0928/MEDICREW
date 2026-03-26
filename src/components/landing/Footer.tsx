"use client";

import Link from "next/link";

const links = {
  Product: ["How It Works", "The Team", "Trust & Safety", "Pricing"],
  Resources: ["Documentation", "API Reference", "Privacy Policy", "Terms"],
  Company: ["About", "Blog", "Contact", "Australia"],
};

export function Footer() {
  return (
    <footer style={{ background: "#ffffff", borderTop: "1px solid #E5E7EB" }}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Top */}
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-bold shadow-sm"
                style={{ background: "linear-gradient(180deg, #56B8FF, #018EF5)" }}>
                +
              </div>
              <span className="font-[family-name:var(--font-mono)] text-sm font-semibold" style={{ color: "#118CFD" }}>
                MediCrew
              </span>
            </div>
            <p className="text-sm max-w-[200px] leading-relaxed" style={{ color: "#637288" }}>
              Health navigation, not medical advice.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-3 gap-12">
            {Object.entries(links).map(([category, items]) => (
              <div key={category}>
                <p className="font-[family-name:var(--font-mono)] text-xs font-medium mb-4 tracking-wide" style={{ color: "#12181B" }}>
                  {category}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {items.map((item) => (
                    <li key={item}>
                      <Link href="#"
                        className="text-sm hover:opacity-70 transition-opacity"
                        style={{ color: "#00329D" }}>
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid #E5E7EB" }}>
          <p className="font-[family-name:var(--font-mono)] text-xs" style={{ color: "#637288" }}>
            © {new Date().getFullYear()} MediCrew. All rights reserved.
          </p>
          <div className="flex gap-5">
            {["Privacy", "Terms", "Cookies"].map((l) => (
              <Link key={l} href="#"
                className="font-[family-name:var(--font-mono)] text-xs hover:opacity-70 transition-opacity"
                style={{ color: "#F7C543", textDecoration: "underline", textDecorationColor: "#F7C543" }}>
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
