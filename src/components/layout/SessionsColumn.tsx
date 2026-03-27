// src/components/layout/SessionsColumn.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface LatestConsultation {
  id: string;
  symptoms: string;
  urgencyLevel: string | null;
  createdAt: string;
}

interface PatientRecord {
  id: string;
  name: string;
  email: string;
  knownConditions: string | null;
  latestConsultation: LatestConsultation | null;
}

const urgencyColor: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  urgent: "bg-orange-100 text-orange-700",
  routine: "bg-green-100 text-green-700",
  self_care: "bg-gray-100 text-gray-600",
};

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("patient") ?? activePatientId;

  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPatients() {
      try {
        const res = await fetch("/api/doctor/patients");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as PatientRecord[];
        if (!cancelled) setPatients(data);
      } catch (err) {
        console.error("SessionsColumn: failed to fetch patients", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchPatients();
    return () => { cancelled = true; };
  }, []);

  function selectPatient(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("patient", id);
    router.push(`/doctor?${params.toString()}`);
  }

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
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && patients.length === 0 && (
          <div className="flex items-center justify-center py-8 px-3">
            <span className="text-[11px] text-gray-400 text-center">No patient sessions found.</span>
          </div>
        )}

        {!loading && patients.map((p) => {
          const isActive = selectedId === p.id;
          const urgency = p.latestConsultation?.urgencyLevel ?? "routine";
          const time = p.latestConsultation
            ? relativeTime(p.latestConsultation.createdAt)
            : "No consult";
          const symptomSnippet = p.latestConsultation?.symptoms.slice(0, 40);

          return (
            <button
              key={p.id}
              onClick={() => selectPatient(p.id)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 transition-colors ${isActive ? "bg-blue-50" : ""}`}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={`https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${p.name.split(" ")[0]}&size=32`}
                  alt={p.name}
                  className="w-8 h-8 rounded-full bg-gray-100"
                />
                {isActive && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                {symptomSnippet && (
                  <p className="text-[10px] text-gray-400 truncate">{symptomSnippet}…</p>
                )}
                <p className="text-[10px] text-gray-400">{time}</p>
              </div>
              <span className={`text-[9px] px-1 py-0.5 rounded font-medium shrink-0 ${urgencyColor[urgency] ?? urgencyColor.routine}`}>
                {urgency}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
