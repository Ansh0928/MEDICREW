"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ArrowLeft, User, Stethoscope, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPortal() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <h1 className="text-xl font-bold">🏥 MediCrew Login</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Welcome to MediCrew</h2>
            <p className="text-muted-foreground">
              Choose your portal to continue
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Patient Portal */}
            <Link href="/login/patient">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className="p-8 h-full cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all group">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    Patient Portal
                    <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Access your health records, view consultation history, and receive notifications from your care team.
                  </p>
                  <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                    <li>✓ View consultation history</li>
                    <li>✓ Track health records</li>
                    <li>✓ Receive doctor notifications</li>
                  </ul>
                </Card>
              </motion.div>
            </Link>

            {/* Doctor Portal */}
            <Link href="/login/doctor">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className="p-8 h-full cursor-pointer hover:border-emerald-400 hover:shadow-lg transition-all group">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                    <Stethoscope className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    Doctor Dashboard
                    <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Review patient cases, analyze AI consultations, and send personalized recommendations.
                  </p>
                  <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                    <li>✓ View patient records</li>
                    <li>✓ Review AI assessments</li>
                    <li>✓ Send notifications</li>
                  </ul>
                </Card>
              </motion.div>
            </Link>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            New to MediCrew? <Link href="/consult" className="text-blue-600 hover:underline">Start a free consultation</Link> to experience our AI-powered health guidance.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
