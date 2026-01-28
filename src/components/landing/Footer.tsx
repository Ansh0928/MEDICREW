"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-12 border-t">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="font-bold text-xl">MediCrew</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MediCrew. Health navigation, not medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
