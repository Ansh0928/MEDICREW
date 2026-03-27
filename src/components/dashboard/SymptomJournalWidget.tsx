"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle } from "lucide-react";

interface JournalEntry {
  id: string;
  severity: number;
  notes: string | null;
  createdAt: string;
}

const SEVERITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Feeling well", color: "bg-green-400" },
  2: { label: "Mild symptoms", color: "bg-yellow-400" },
  3: { label: "Moderate", color: "bg-orange-400" },
  4: { label: "Significant", color: "bg-red-400" },
  5: { label: "Very unwell", color: "bg-red-600" },
};

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export function SymptomJournalWidget() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [severity, setSeverity] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/patient/journal");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.entries ?? []);
        setEntries(arr.slice(0, 7));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSubmit = async () => {
    if (severity === null) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/patient/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity, notes: notes.trim() || null }),
      });
      if (res.ok) {
        setSubmitted(true);
        setSeverity(null);
        setNotes("");
        await loadEntries();
        setTimeout(() => setSubmitted(false), 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const todayEntry = entries.find((e) => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="space-y-4">
      {/* Check-in card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Daily Check-In
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex items-center gap-2 text-green-600 text-sm py-2">
              <CheckCircle className="w-4 h-4" />
              Check-in recorded. Take care!
            </div>
          ) : todayEntry ? (
            <div className="text-sm text-muted-foreground py-1">
              Today&apos;s check-in:{" "}
              <span className="font-medium text-foreground">
                {SEVERITY_LABELS[todayEntry.severity]?.label ?? `${todayEntry.severity}/5`}
              </span>
              {todayEntry.notes && (
                <span className="block text-xs mt-1 italic">&ldquo;{todayEntry.notes}&rdquo;</span>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">How are you feeling today?</p>

              {/* Severity buttons */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {([1, 2, 3, 4, 5] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => setSeverity(val)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-2.5 px-1 transition-all text-xs ${
                      severity === val
                        ? "border-blue-500 bg-blue-50"
                        : "border-transparent bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full ${SEVERITY_LABELS[val].color} flex items-center justify-center text-white font-bold text-sm`}
                    >
                      {val}
                    </div>
                    <span className="text-center leading-tight text-gray-600">
                      {SEVERITY_LABELS[val].label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Notes */}
              <textarea
                className="w-full text-sm border rounded-lg px-3 py-2 resize-none h-20 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-muted-foreground"
                placeholder="Any notes? (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button
                className="mt-3 w-full"
                disabled={severity === null || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Saving…" : "Record Check-In"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sparkline history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Wellbeing</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-1.5 items-end h-12">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gray-200 rounded animate-pulse"
                  style={{ height: `${30 + i * 5}%` }}
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No entries yet. Record your first check-in above.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Mini bar chart */}
              <div className="flex gap-1.5 items-end h-14">
                {[...entries].reverse().map((e, i) => {
                  const heightPct = (e.severity / 5) * 100;
                  const bar = SEVERITY_LABELS[e.severity];
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col justify-end gap-1"
                      title={`${bar?.label ?? e.severity} — ${formatRelative(e.createdAt)}`}
                    >
                      <div
                        className={`${bar?.color ?? "bg-gray-400"} rounded-sm opacity-80`}
                        style={{ height: `${heightPct}%`, minHeight: 4 }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Latest entry list */}
              <ul className="space-y-1.5 mt-1">
                {entries.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={`text-xs ${SEVERITY_LABELS[e.severity]?.color.replace("bg-", "border-").replace("400", "300").replace("600", "500")}`}
                    >
                      {SEVERITY_LABELS[e.severity]?.label ?? `${e.severity}/5`}
                    </Badge>
                    {e.notes && (
                      <span className="text-muted-foreground truncate max-w-[150px] italic">
                        {e.notes}
                      </span>
                    )}
                    <span className="text-muted-foreground ml-auto">{formatRelative(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
