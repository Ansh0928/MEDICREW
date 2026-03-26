"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export interface JournalEntry {
  id: string;
  patientId: string;
  severity: number;
  notes: string | null;
  createdAt: string;
}

interface SymptomJournalEntryProps {
  entries: JournalEntry[];
  onEntryAdded: (entry: JournalEntry) => void;
}

const severityLabels: Record<number, string> = {
  1: "Minimal",
  2: "Mild",
  3: "Moderate",
  4: "Severe",
  5: "Very Severe",
};

// Color classes for severity badges in the recent entries list
const severityBadgeClasses: Record<number, string> = {
  1: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300",
  2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300",
  3: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300",
  4: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300",
  5: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300 border-red-400",
};

// Color classes for the severity selector buttons
const severityButtonActive: Record<number, string> = {
  1: "bg-green-500 text-white border-green-500",
  2: "bg-yellow-500 text-white border-yellow-500",
  3: "bg-orange-500 text-white border-orange-500",
  4: "bg-red-500 text-white border-red-500",
  5: "bg-red-700 text-white border-red-700",
};

export function SymptomJournalEntry({ entries, onEntryAdded }: SymptomJournalEntryProps) {
  const [severity, setSeverity] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (severity === null) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/patient/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ severity, notes: notes.trim() || null }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Submit failed" }));
        throw new Error((err as { error?: string }).error ?? "Submit failed");
      }

      const newEntry: JournalEntry = await res.json();
      onEntryAdded(newEntry);

      // Clear form
      setSeverity(null);
      setNotes("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* New entry form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Today&apos;s Symptoms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Severity selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              How severe are your symptoms?
            </Label>
            <div className="flex gap-2 flex-wrap">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  className={`flex-1 min-w-[60px] py-2 px-1 rounded-md border text-sm font-medium transition-colors ${
                    severity === level
                      ? severityButtonActive[level]
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  aria-pressed={severity === level}
                  aria-label={`Severity ${level}: ${severityLabels[level]}`}
                >
                  <span className="block text-center font-bold">{level}</span>
                  <span className="block text-center text-xs">{severityLabels[level]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="journal-notes" className="text-xs font-medium text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              id="journal-notes"
              className="mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling today?"
              rows={3}
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={severity === null || submitting}
            className="w-full"
          >
            {submitting ? "Saving..." : "Log Entry"}
          </Button>
        </CardContent>
      </Card>

      {/* Recent entries list */}
      {entries.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent Entries</h3>
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card key={entry.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          severityBadgeClasses[entry.severity] ?? severityBadgeClasses[3]
                        }`}
                      >
                        {entry.severity} — {severityLabels[entry.severity] ?? "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString("en-AU", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-foreground">{entry.notes}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No journal entries yet. Log your first entry above.
        </p>
      )}
    </div>
  );
}
