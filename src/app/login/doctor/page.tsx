"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Stethoscope, Mail, Lock, LogIn } from "lucide-react";

// Demo doctors for login
const DEMO_DOCTORS = [
  { id: "dr-1", name: "Dr. Sarah Chen", email: "sarah@medicrew.com", specialty: "General Practice" },
  { id: "dr-2", name: "Dr. James Wilson", email: "james@medicrew.com", specialty: "Cardiology" },
  { id: "dr-3", name: "Dr. Emily Torres", email: "emily@medicrew.com", specialty: "Mental Health" },
];

export default function DoctorLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Seed demo doctors on mount
  useEffect(() => {
    const seedDoctors = async () => {
      for (const doctor of DEMO_DOCTORS) {
        try {
          await fetch("/api/doctors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(doctor),
          });
        } catch {
          // Ignore errors - doctors may already exist
        }
      }
    };
    seedDoctors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if email matches a demo doctor
      const doctor = DEMO_DOCTORS.find(d => d.email === formData.email);

      if (!doctor) {
        setError("Invalid credentials. Use one of the demo doctor emails.");
        setLoading(false);
        return;
      }

      // Store in localStorage and redirect
      localStorage.setItem("doctorEmail", doctor.email);
      localStorage.setItem("doctorName", doctor.name);
      localStorage.setItem("doctorId", doctor.id);
      localStorage.setItem("doctorSpecialty", doctor.specialty);
      router.push("/doctor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (doctor: typeof DEMO_DOCTORS[0]) => {
    setFormData({ email: doctor.email, password: "demo123" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-emerald-600">👨‍⚕️ Doctor Portal</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold">Doctor Login</h2>
              <p className="text-muted-foreground mt-2">
                Access patient records and send notifications
              </p>
            </div>

            {/* Quick login buttons */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">Demo accounts (click to fill):</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_DOCTORS.map((doctor) => (
                  <button
                    key={doctor.id}
                    type="button"
                    onClick={() => handleQuickLogin(doctor)}
                    className="text-xs px-3 py-1.5 rounded-full border hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    {doctor.name.split(" ")[1]}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@medicrew.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  (Demo mode - any password works)
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? (
                  "Please wait..."
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t text-center">
              <Link
                href="/login/patient"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Are you a patient? Login here →
              </Link>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
