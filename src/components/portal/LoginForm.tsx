"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Stethoscope, User } from "lucide-react";

interface LoginFormProps {
  defaultRole?: "patient" | "doctor";
  showRoleToggle?: boolean;
}

export function LoginForm({
  defaultRole = "patient",
  showRoleToggle = true,
}: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"patient" | "doctor">(defaultRole);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(email, password, role);
    setLoading(false);
    if (ok) {
      router.push(role === "doctor" ? "/doctor" : "/patient");
      return;
    }
    setError(
      `Invalid login. Use ${role}@demo.com (any password).`
    );
  };

  const title =
    role === "doctor" ? "Doctor Portal" : role === "patient" ? "Patient Portal" : "Doctors & Patients Portal";
  const subtitle =
    role === "doctor"
      ? "Sign in to access the doctor dashboard"
      : role === "patient"
      ? "Sign in to check your symptoms"
      : "Sign in to access the patient or doctor portal";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 justify-center mb-2"
          >
            <span className="text-2xl">🏥</span>
            <span className="font-bold text-xl">MediCrew</span>
          </Link>
          <CardTitle className="text-xl">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {showRoleToggle && (
              <div>
                <Label>I am a</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={role === "patient" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setRole("patient")}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Patient
                  </Button>
                  <Button
                    type="button"
                    variant={role === "doctor" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setRole("doctor")}
                  >
                    <Stethoscope className="w-4 h-4 mr-2" />
                    Doctor
                  </Button>
                </div>
              </div>
            )}
            {!showRoleToggle && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-muted rounded-lg">
                {role === "doctor" ? (
                  <Stethoscope className="w-5 h-5 text-primary" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
                <span className="font-medium">
                  {role === "doctor" ? "Doctor" : "Patient"} Login
                </span>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder={
                  role === "patient" ? "patient@demo.com" : "doctor@demo.com"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Any password for demo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Demo: {role}@demo.com (any password)
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            {showRoleToggle ? (
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to home
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← All logins
                </Link>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Home
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
