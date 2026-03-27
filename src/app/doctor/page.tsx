"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { HuddleRoom } from "@/components/consult/HuddleRoom";
import { SwarmDebugPanel } from "@/components/doctor/SwarmDebugPanel";
import { PatientProfilePanel } from "@/components/doctor/PatientProfilePanel";
import { NotesPanel } from "@/components/doctor/NotesPanel";
import { SwarmState, SwarmPhase } from "@/agents/swarm-types";
import { UrgencyLevel } from "@/agents/types";
import { ChevronRight, ChevronLeft, Calendar, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Tab types ─────────────────────────────────────────────────────────────────

type WorkspaceTab = "huddle" | "profile" | "notes";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "huddle", label: "Team Huddle" },
  { id: "profile", label: "Patient Profile" },
  { id: "notes", label: "Notes" },
];

// ── Urgency badge ─────────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  routine: "bg-green-100 text-green-700",
  self_care: "bg-gray-100 text-gray-600",
  urgent: "bg-yellow-100 text-yellow-700",
  emergency: "bg-red-100 text-red-700",
};

function UrgencyBadge({ urgency }: { urgency: UrgencyLevel | null }) {
  if (!urgency) return null;
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${URGENCY_STYLES[urgency]}`}
    >
      {urgency}
    </span>
  );
}

// ── Doctor page ───────────────────────────────────────────────────────────────

export default function DoctorPage() {
  const [swarmState, setSwarmState] = useState<Partial<SwarmState>>({});
  const [debugOpen, setDebugOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("huddle");
  const [urgency, setUrgency] = useState<UrgencyLevel | null>(null);
  const [currentPhase, setCurrentPhase] = useState<SwarmPhase | null>(null);

  // Reactive urgency update from triage_complete SSE (via swarmState)
  const handleSwarmStateChange = useCallback((state: Partial<SwarmState>) => {
    setSwarmState(state);
    if (state.triage?.urgency && !urgency) {
      setUrgency(state.triage.urgency);
    }
  }, [urgency]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }, []);

  // Stub patient context — in Session 3 this will come from real patient data
  const patientName = "Jordan K.";
  const patientSymptom = "Back pain";
  const consultDate = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <AppShell activePatientId="1">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0 gap-3">
        {/* Patient info */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="https://api.dicebear.com/8.x/notionists-neutral/svg?seed=Jordan&size=36"
            alt={patientName}
            className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                {patientName} — {patientSymptom}
              </h2>
              <UrgencyBadge urgency={urgency} />
              {currentPhase && !urgency && (
                <span className="text-xs text-gray-400 capitalize">{currentPhase}…</span>
              )}
            </div>
            <p className="text-xs text-gray-500">{consultDate}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Book Appointment
          </Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={handleCopyLink}>
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDebugOpen((o) => !o)}
            className="text-xs text-muted-foreground gap-1 ml-1"
          >
            {debugOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            Debug
          </Button>
        </div>
      </div>

      {/* ── Workspace tab bar ── */}
      <div className="flex items-center gap-0 px-4 border-b border-gray-100 bg-white flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {/* Team Huddle tab — keep mounted so consultation keeps streaming */}
          <div className={activeTab === "huddle" ? "h-full" : "hidden"}>
            <HuddleRoom
              symptoms="I'm 23 years old having back pain due to cycling. Haven't done anything about it. No medicines."
              patientInfo={{ age: "23", gender: "male" }}
              onSwarmStateChange={handleSwarmStateChange}
              onPhaseChange={setCurrentPhase}
            />
          </div>

          {activeTab === "profile" && (
            <div className="h-full overflow-y-auto">
              <PatientProfilePanel />
            </div>
          )}

          {activeTab === "notes" && (
            <div className="h-full">
              <NotesPanel />
            </div>
          )}
        </div>

        {/* Debug sidebar */}
        {debugOpen && (
          <aside className="w-72 border-l border-gray-100 bg-gray-50 p-3 overflow-y-auto shrink-0">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Swarm Debug
            </h3>
            <SwarmDebugPanel state={swarmState} />
          </aside>
        )}
      </div>
    </AppShell>
  );
}
