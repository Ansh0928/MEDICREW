"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HealthProfileForm,
  type PatientProfile,
} from "@/components/profile/HealthProfileForm";
import {
  SymptomJournalEntry,
  type JournalEntry,
} from "@/components/profile/SymptomJournalEntry";
import { SymptomTrendChart } from "@/components/profile/SymptomTrendChart";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const patientId = localStorage.getItem("patientId");
    if (!patientId) {
      router.push("/login/patient");
      return;
    }
    loadData(patientId);
  }, [router]);

  const loadData = async (patientId: string) => {
    setLoading(true);
    setError(null);

    try {
      const headers = { "x-patient-id": patientId };

      const [profileRes, journalRes] = await Promise.all([
        fetch("/api/patient/profile", { headers }),
        fetch("/api/patient/journal", { headers }),
      ]);

      if (!profileRes.ok) {
        if (profileRes.status === 401 || profileRes.status === 404) {
          router.push("/login/patient");
          return;
        }
        throw new Error("Failed to load profile");
      }

      const profileData: PatientProfile = await profileRes.json();
      setProfile(profileData);

      if (journalRes.ok) {
        const journalData: JournalEntry[] = await journalRes.json();
        setJournalEntries(journalData);
      }
    } catch {
      setError("Failed to load your health profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdated = (updated: PatientProfile) => {
    setProfile(updated);
  };

  const handleEntryAdded = (entry: JournalEntry) => {
    setJournalEntries((prev) => [entry, ...prev]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading your health profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-600">{error ?? "Profile not found."}</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/patient")}>
            Back to Patient Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/patient">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Patient Portal
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Health Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Two-column layout on desktop, single column on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Health profile form */}
            <div>
              <HealthProfileForm
                profile={profile}
                onProfileUpdated={handleProfileUpdated}
              />
            </div>

            {/* Right: Symptom journal */}
            <div>
              <SymptomJournalEntry
                entries={journalEntries}
                onEntryAdded={handleEntryAdded}
              />
            </div>
          </div>

          {/* Symptom trend chart — full width below the two-column grid */}
          <section className="mt-6">
            <SymptomTrendChart patientId={profile.id} />
          </section>
        </div>
      </main>
    </div>
  );
}
