"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

interface GpDetails {
  name?: string;
  practice?: string;
  phone?: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: string | null;
  knownConditions: string | null;
  medications: string[];
  allergies: string[];
  emergencyContact: EmergencyContact | null;
  gpDetails: GpDetails | null;
  onboardingComplete: boolean;
}

interface HealthProfileFormProps {
  profile: PatientProfile;
  onProfileUpdated: (updated: PatientProfile) => void;
}

export function HealthProfileForm({ profile, onProfileUpdated }: HealthProfileFormProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable state
  const [knownConditions, setKnownConditions] = useState(profile.knownConditions ?? "");
  const [medications, setMedications] = useState<string[]>(profile.medications ?? []);
  const [allergies, setAllergies] = useState<string[]>(profile.allergies ?? []);
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>(
    profile.emergencyContact ?? {}
  );
  const [gpDetails, setGpDetails] = useState<GpDetails>(profile.gpDetails ?? {});

  // Temp inputs for list fields
  const [newMedication, setNewMedication] = useState("");
  const [newAllergy, setNewAllergy] = useState("");

  const handleCancel = () => {
    // Reset to original profile values
    setKnownConditions(profile.knownConditions ?? "");
    setMedications(profile.medications ?? []);
    setAllergies(profile.allergies ?? []);
    setEmergencyContact(profile.emergencyContact ?? {});
    setGpDetails(profile.gpDetails ?? {});
    setNewMedication("");
    setNewAllergy("");
    setEditing(false);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          knownConditions: knownConditions || null,
          medications,
          allergies,
          emergencyContact: Object.keys(emergencyContact).length > 0 ? emergencyContact : null,
          gpDetails: Object.keys(gpDetails).length > 0 ? gpDetails : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error((err as { error?: string }).error ?? "Save failed");
      }

      const updated: PatientProfile = await res.json();
      onProfileUpdated(updated);
      setEditing(false);
      setSaveMessage({ type: "success", text: "Profile saved successfully." });
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  const addMedication = () => {
    const val = newMedication.trim();
    if (val && !medications.includes(val)) {
      setMedications((prev) => [...prev, val]);
    }
    setNewMedication("");
  };

  const removeMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const addAllergy = () => {
    const val = newAllergy.trim();
    if (val && !allergies.includes(val)) {
      setAllergies((prev) => [...prev, val]);
    }
    setNewAllergy("");
  };

  const removeAllergy = (index: number) => {
    setAllergies((prev) => prev.filter((_, i) => i !== index));
  };

  const formattedDob = profile.dateOfBirth
    ? new Date(profile.dateOfBirth).toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Health Profile</CardTitle>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Read-only identity fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Name</p>
            <p className="text-sm font-medium">{profile.name}</p>
          </div>
          {formattedDob && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date of Birth</p>
              <p className="text-sm font-medium">{formattedDob}</p>
            </div>
          )}
          {profile.gender && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Gender</p>
              <p className="text-sm font-medium capitalize">{profile.gender}</p>
            </div>
          )}
        </div>

        {/* Known Conditions */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Known Conditions</Label>
          {editing ? (
            <Textarea
              className="mt-1"
              value={knownConditions}
              onChange={(e) => setKnownConditions(e.target.value)}
              placeholder="e.g. Diabetes Type 2, Hypertension"
              rows={3}
            />
          ) : (
            <p className="mt-1 text-sm">
              {profile.knownConditions || (
                <span className="text-muted-foreground">None recorded</span>
              )}
            </p>
          )}
        </div>

        {/* Medications */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Medications</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {medications.map((med, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {med}
                {editing && (
                  <button
                    type="button"
                    onClick={() => removeMedication(i)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${med}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
            {medications.length === 0 && (
              <span className="text-sm text-muted-foreground">None recorded</span>
            )}
          </div>
          {editing && (
            <div className="flex gap-2 mt-2">
              <Input
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMedication())}
                placeholder="Add medication"
                className="h-8 text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addMedication}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Allergies */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Allergies</Label>
          <div className="mt-1 flex flex-wrap gap-1">
            {allergies.map((allergy, i) => (
              <Badge key={i} variant="outline" className="gap-1 border-amber-400 text-amber-700 dark:text-amber-400">
                {allergy}
                {editing && (
                  <button
                    type="button"
                    onClick={() => removeAllergy(i)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove ${allergy}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
            {allergies.length === 0 && (
              <span className="text-sm text-muted-foreground">None recorded</span>
            )}
          </div>
          {editing && (
            <div className="flex gap-2 mt-2">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
                placeholder="Add allergy"
                className="h-8 text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addAllergy}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Emergency Contact</Label>
          {editing ? (
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                placeholder="Full name"
                value={emergencyContact.name ?? ""}
                onChange={(e) =>
                  setEmergencyContact((prev) => ({ ...prev, name: e.target.value }))
                }
                className="text-sm"
              />
              <Input
                placeholder="Phone number"
                value={emergencyContact.phone ?? ""}
                onChange={(e) =>
                  setEmergencyContact((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="text-sm"
              />
              <Input
                placeholder="Relationship"
                value={emergencyContact.relationship ?? ""}
                onChange={(e) =>
                  setEmergencyContact((prev) => ({
                    ...prev,
                    relationship: e.target.value,
                  }))
                }
                className="text-sm"
              />
            </div>
          ) : profile.emergencyContact &&
            (profile.emergencyContact.name || profile.emergencyContact.phone) ? (
            <div className="mt-1 text-sm">
              <p>
                {profile.emergencyContact.name}
                {profile.emergencyContact.relationship &&
                  ` (${profile.emergencyContact.relationship})`}
              </p>
              {profile.emergencyContact.phone && (
                <p className="text-muted-foreground">{profile.emergencyContact.phone}</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">None recorded</p>
          )}
        </div>

        {/* GP Details */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">GP Details</Label>
          {editing ? (
            <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                placeholder="GP name"
                value={gpDetails.name ?? ""}
                onChange={(e) =>
                  setGpDetails((prev) => ({ ...prev, name: e.target.value }))
                }
                className="text-sm"
              />
              <Input
                placeholder="Practice name"
                value={gpDetails.practice ?? ""}
                onChange={(e) =>
                  setGpDetails((prev) => ({ ...prev, practice: e.target.value }))
                }
                className="text-sm"
              />
              <Input
                placeholder="Phone number"
                value={gpDetails.phone ?? ""}
                onChange={(e) =>
                  setGpDetails((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="text-sm"
              />
            </div>
          ) : profile.gpDetails && (profile.gpDetails.name || profile.gpDetails.practice) ? (
            <div className="mt-1 text-sm">
              <p>{profile.gpDetails.name}</p>
              {profile.gpDetails.practice && (
                <p className="text-muted-foreground">{profile.gpDetails.practice}</p>
              )}
              {profile.gpDetails.phone && (
                <p className="text-muted-foreground">{profile.gpDetails.phone}</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">None recorded</p>
          )}
        </div>

        {/* Save feedback */}
        {saveMessage && (
          <div
            className={`text-sm rounded-md px-3 py-2 ${
              saveMessage.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
            }`}
          >
            {saveMessage.text}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
