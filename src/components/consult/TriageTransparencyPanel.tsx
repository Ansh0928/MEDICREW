"use client";
import { DoctorOrbRow } from "./DoctorOrbRow";
import { LiveFeedLine } from "./LiveFeedLine";
import { DoctorRole } from "@/agents/swarm-types";

export type OrbStatus = "waiting" | "active" | "done";

export interface OrbState {
  role: DoctorRole;
  status: OrbStatus;
}

interface TriageTransparencyPanelProps {
  orbs: OrbState[];
  liveFeed: string;
  isVisible: boolean;
}

/**
 * Shared panel showing agent activations + live feed.
 * Used in SwarmChat (patient view) and HuddleRoom (doctor team overview).
 */
export function TriageTransparencyPanel({ orbs, liveFeed, isVisible }: TriageTransparencyPanelProps) {
  if (!isVisible) return null;

  return (
    <div className="border rounded-xl p-4 mb-4 space-y-3">
      <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">
        Your care team
      </p>
      <DoctorOrbRow orbs={orbs} />
      <LiveFeedLine text={liveFeed} />
    </div>
  );
}
