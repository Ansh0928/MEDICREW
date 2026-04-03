// src/components/doctor/PatientProfilePanel.tsx
"use client";

import { useEffect, useState } from "react";

interface PatientProfile {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  knownConditions: string | null;
  medications: string[];
  allergies: string[];
  emergencyContact: unknown;
  gpDetails: unknown;
  onboardingComplete: boolean;
}

function calcAge(dob: string | null): string {
  if (!dob) return "Unknown";
  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const hadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());
  return `${hadBirthday ? age : age - 1} years`;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function TagList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0)
    return <p className="text-sm text-gray-400 italic">{emptyText}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function PatientProfilePanel() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/patient/profile")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: PatientProfile) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        Loading patient profile…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-red-400">
        Could not load patient profile.
      </div>
    );
  }

  const conditions = profile.knownConditions
    ? profile.knownConditions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <img
          src={`https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${encodeURIComponent(profile.name)}&size=48`}
          alt={profile.name}
          className="w-12 h-12 rounded-full bg-gray-100"
        />
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {profile.name}
          </h2>
          <p className="text-sm text-gray-500">
            {calcAge(profile.dateOfBirth)}
            {profile.gender ? ` · ${profile.gender}` : ""}
          </p>
        </div>
      </div>

      <Section title="Known Conditions">
        <TagList items={conditions} emptyText="No conditions recorded" />
      </Section>

      <Section title="Current Medications">
        <TagList
          items={profile.medications}
          emptyText="No medications recorded"
        />
      </Section>

      <Section title="Allergies">
        <TagList items={profile.allergies} emptyText="No allergies recorded" />
      </Section>

      <Section title="GP Details">
        {profile.gpDetails ? (
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
            {JSON.stringify(profile.gpDetails, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-gray-400 italic">No GP details on file</p>
        )}
      </Section>
    </div>
  );
}
