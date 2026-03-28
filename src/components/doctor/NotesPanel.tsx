"use client";

import { useState } from "react";
import { ClipboardCopy, RefreshCw, FileText, Loader2, CheckCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SOAPNote {
  disclaimer: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  generatedAt: string;
}

interface NotesPanelProps {
  consultationId?: string;
}

export function NotesPanel({ consultationId }: NotesPanelProps) {
  const [note, setNote] = useState<SOAPNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateNote = async () => {
    if (!consultationId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/doctor/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { note: SOAPNote };
      setNote(data.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate note");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!note) return;
    const text = [
      `SOAP Clinical Note — ${new Date(note.generatedAt).toLocaleString()}`,
      "",
      `S (Subjective): ${note.subjective}`,
      "",
      `O (Objective): ${note.objective}`,
      "",
      `A (Assessment): ${note.assessment}`,
      "",
      `P (Plan): ${note.plan}`,
      "",
      `---`,
      note.disclaimer,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!consultationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-8">
        <FileText className="w-8 h-8 opacity-40" />
        <p className="text-sm text-center">No active consultation. Start a consultation to generate a SOAP note.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          Clinical Note
        </h3>
        <div className="flex items-center gap-2">
          {note && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="text-xs gap-1.5 h-7"
              disabled={copied}
            >
              {copied ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            onClick={generateNote}
            disabled={loading}
            className="text-xs gap-1.5 h-7"
            variant={note ? "outline" : "default"}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : note ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                Generate Note
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {!note && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-16">
            <FileText className="w-8 h-8 opacity-30" />
            <p className="text-sm text-center text-gray-500">
              Click <strong>Generate Note</strong> to create a structured SOAP note from this consultation.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
            <p className="text-sm text-gray-500">Generating clinical note...</p>
          </div>
        )}

        {note && !loading && (
          <div className="space-y-4">
            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 leading-relaxed">{note.disclaimer}</p>
            </div>

            {/* SOAP sections */}
            {(
              [
                { key: "subjective", label: "S — Subjective", bg: "bg-blue-50", border: "border-blue-100", heading: "text-blue-700" },
                { key: "objective", label: "O — Objective", bg: "bg-purple-50", border: "border-purple-100", heading: "text-purple-700" },
                { key: "assessment", label: "A — Assessment", bg: "bg-orange-50", border: "border-orange-100", heading: "text-orange-700" },
                { key: "plan", label: "P — Plan", bg: "bg-green-50", border: "border-green-100", heading: "text-green-700" },
              ] as const
            ).map(({ key, label, bg, border, heading }) => (
              <div key={key} className={`rounded-lg border p-3 ${bg} ${border}`}>
                <h4 className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${heading}`}>
                  {label}
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {note[key]}
                </p>
              </div>
            ))}

            {/* Timestamp */}
            <p className="text-[10px] text-gray-400 text-right">
              Generated {new Date(note.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
