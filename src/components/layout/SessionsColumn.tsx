// src/components/layout/SessionsColumn.tsx
"use client";

import { useState, useEffect } from "react";

interface Consultation {
  id: string;
  urgencyLevel: string | null;
  createdAt: string;
}

interface PatientRecord {
  id: string;
  name: string;
  consultations: Consultation[];
}

interface SessionEntry {
  id: string;
  name: string;
  avatarSeed: string;
  urgency: "emergency" | "urgent" | "routine";
  time: string;
  isActive?: boolean;
}

const urgencyColor: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  urgent: "bg-orange-100 text-orange-700",
  routine: "bg-green-100 text-green-700",
  self_care: "bg-gray-100 text-gray-600",
};

function normaliseUrgency(raw: string | null | undefined): "emergency" | "urgent" | "routine" {
  if (raw === "emergency") return "emergency";
  if (raw === "urgent") return "urgent";
  return "routine";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SessionsColumn({ activePatientId }: { activePatientId?: string }) {
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      try {
        const res = await fetch("/api/patients");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as PatientRecord[];

        if (cancelled) return;

        const mapped: SessionEntry[] = data.map((p, idx) => {
          const latest = p.consultations[0] ?? null;
          return {
            id: p.id,
            name: p.name,
            avatarSeed: p.name.split(" ")[0] ?? p.id,
            urgency: normaliseUrgency(latest?.urgencyLevel),
            time: latest ? relativeTime(latest.createdAt) : "No consult",
            isActive: idx === 0 && !activePatientId,
          };
        });

        setSessions(mapped);
      } catch (err) {
        console.error("SessionsColumn: failed to fetch patients", err);
        // Fail silently — show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchPatients();

    return () => {
      cancelled = true;
    };
  }, [activePatientId]);

  return (
    <div className="w-56 flex flex-col border-r border-gray-100 bg-white flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["upcoming", "recent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${tab === t ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-[11px] text-gray-400 animate-pulse">Loading sessions...</span>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-8 px-3">
            <span className="text-[11px] text-gray-400 text-center">No patient sessions found.</span>
          </div>
        )}

        {!loading && sessions.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-50 ${p.isActive || activePatientId === p.id ? "bg-blue-50" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={`https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${p.avatarSeed}&size=32`}
                alt={p.name}
                className="w-8 h-8 rounded-full bg-gray-100"
              />
              {(p.isActive || activePatientId === p.id) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-[10px] text-gray-400">{p.time}</p>
            </div>
            <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${urgencyColor[p.urgency] ?? urgencyColor.routine}`}>
              {p.urgency}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
