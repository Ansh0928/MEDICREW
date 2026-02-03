"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="font-bold text-xl">MediCrew</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#team"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              The Team
            </Link>
            <Link
              href="#safety"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Trust & Safety
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/patient"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Patient Portal
              </Link>
              <span className="text-muted-foreground/50">|</span>
              <Link
                href="/doctor"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Doctor Dashboard
              </Link>
            </div>
            <Link
              href="/login"
              className="sm:hidden text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Link href="/consult">
              <Button>Start Consultation</Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
