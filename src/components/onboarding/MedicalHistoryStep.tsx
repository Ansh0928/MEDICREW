"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MedicalHistoryStepProps {
  onComplete: () => void;
}

export function MedicalHistoryStep({ onComplete }: MedicalHistoryStepProps) {
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [knownConditions, setKnownConditions] = useState("");
  const [medications, setMedications] = useState<string[]>([]);
  const [medInput, setMedInput] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");

  // Emergency contact
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");

  // GP details
  const [gpName, setGpName] = useState("");
  const [gpPractice, setGpPractice] = useState("");
  const [gpPhone, setGpPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addMedication() {
    const trimmed = medInput.trim();
    if (trimmed) {
      setMedications((prev) => [...prev, trimmed]);
      setMedInput("");
    }
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  function addAllergy() {
    const trimmed = allergyInput.trim();
    if (trimmed) {
      setAllergies((prev) => [...prev, trimmed]);
      setAllergyInput("");
    }
  }

  function removeAllergy(index: number) {
    setAllergies((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!dateOfBirth || !gender) return;

    setSubmitting(true);
    setError(null);

    const emergencyContact =
      ecName || ecPhone || ecRelationship
        ? { name: ecName, phone: ecPhone, relationship: ecRelationship }
        : undefined;

    const gpDetails =
      gpName || gpPractice || gpPhone
        ? { name: gpName, practice: gpPractice, phone: gpPhone }
        : undefined;

    try {
      const res = await fetch("/api/patient/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateOfBirth,
          gender,
          knownConditions: knownConditions || undefined,
          medications,
          allergies,
          emergencyContact,
          gpDetails,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleNext} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="dob">Date of Birth *</Label>
          <Input
            id="dob"
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="gender">Gender *</Label>
          <select
            id="gender"
            required
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <Label htmlFor="conditions">Known Medical Conditions</Label>
          <Textarea
            id="conditions"
            value={knownConditions}
            onChange={(e) => setKnownConditions(e.target.value)}
            placeholder="e.g., Type 2 diabetes, hypertension..."
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label>Current Medications</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={medInput}
              onChange={(e) => setMedInput(e.target.value)}
              placeholder="e.g., Metformin 500mg"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
            />
            <Button type="button" variant="outline" onClick={addMedication}>
              Add
            </Button>
          </div>
          {medications.length > 0 && (
            <ul className="mt-2 space-y-1">
              {medications.map((med, i) => (
                <li key={i} className="flex items-center justify-between rounded bg-muted px-3 py-1 text-sm">
                  <span>{med}</span>
                  <button
                    type="button"
                    onClick={() => removeMedication(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <Label>Allergies</Label>
          <div className="mt-1 flex gap-2">
            <Input
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              placeholder="e.g., Penicillin, peanuts..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
            />
            <Button type="button" variant="outline" onClick={addAllergy}>
              Add
            </Button>
          </div>
          {allergies.length > 0 && (
            <ul className="mt-2 space-y-1">
              {allergies.map((allergy, i) => (
                <li key={i} className="flex items-center justify-between rounded bg-muted px-3 py-1 text-sm">
                  <span>{allergy}</span>
                  <button
                    type="button"
                    onClick={() => removeAllergy(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Emergency Contact (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="ec-name">Name</Label>
              <Input id="ec-name" value={ecName} onChange={(e) => setEcName(e.target.value)} className="mt-1" placeholder="Full name" />
            </div>
            <div>
              <Label htmlFor="ec-phone">Phone</Label>
              <Input id="ec-phone" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} className="mt-1" placeholder="Mobile or home number" />
            </div>
            <div>
              <Label htmlFor="ec-relationship">Relationship</Label>
              <Input id="ec-relationship" value={ecRelationship} onChange={(e) => setEcRelationship(e.target.value)} className="mt-1" placeholder="e.g., Spouse, parent..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">GP / Regular Doctor (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="gp-name">Doctor Name</Label>
              <Input id="gp-name" value={gpName} onChange={(e) => setGpName(e.target.value)} className="mt-1" placeholder="e.g., Dr. Jane Smith" />
            </div>
            <div>
              <Label htmlFor="gp-practice">Practice / Clinic</Label>
              <Input id="gp-practice" value={gpPractice} onChange={(e) => setGpPractice(e.target.value)} className="mt-1" placeholder="Practice or clinic name" />
            </div>
            <div>
              <Label htmlFor="gp-phone">Phone</Label>
              <Input id="gp-phone" value={gpPhone} onChange={(e) => setGpPhone(e.target.value)} className="mt-1" placeholder="Clinic phone number" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={!dateOfBirth || !gender || submitting} className="w-full">
        {submitting ? "Saving..." : "Next: Consent"}
      </Button>
    </form>
  );
}
