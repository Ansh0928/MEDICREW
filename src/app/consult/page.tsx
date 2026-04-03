"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SwarmChat } from "@/components/consult/SwarmChat";

export default function ConsultPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="font-bold text-xl">MediCrew</span>
          </div>
        </header>

        <section className="mb-6 rounded-lg border bg-background p-4">
          <h1 className="text-lg font-semibold">
            Start your AI care team consultation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You are signed in so your care summary, recommended next steps, and
            check-ins can be saved in your patient portal. If symptoms are
            severe or suddenly worsening, call 000 first.
          </p>
        </section>

        <SwarmChat />
      </div>
    </main>
  );
}
