"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { HuddleRoom } from "@/components/consult/HuddleRoom";
import { SwarmDebugPanel } from "@/components/doctor/SwarmDebugPanel";
import { SwarmState } from "@/agents/swarm-types";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DoctorPage() {
  const [swarmState, setSwarmState] = useState<Partial<SwarmState>>({});
  const [debugOpen, setDebugOpen] = useState(true);

  return (
    <AppShell activePatientId="1">
      {/* Patient header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="https://api.dicebear.com/8.x/notionists-neutral/svg?seed=Jordan&size=36"
            alt="Jordan K."
            className="w-9 h-9 rounded-full bg-gray-100"
          />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Jordan K. — Back pain</h2>
            <p className="text-xs text-gray-500">Today · Routine</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDebugOpen((o) => !o)}
          className="text-xs text-muted-foreground gap-1"
        >
          {debugOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          Swarm Debug
        </Button>
      </div>

      {/* Main content + optional debug sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <HuddleRoom
            symptoms="I'm 23 years old having back pain due to cycling. Haven't done anything about it. No medicines."
            patientInfo={{ age: "23", gender: "male" }}
          />
        </div>

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
