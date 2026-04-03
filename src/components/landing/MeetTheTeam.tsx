"use client";

import { agentRegistry } from "@/agents/definitions";
import { AgentRole } from "@/agents/types";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const teamRoles: AgentRole[] = [
  "triage",
  "gp",
  "cardiology",
  "mental_health",
  "dermatology",
  "orthopedic",
  "gastro",
  "physiotherapy",
];

const roleConfig: Record<
  string,
  { color: string; seed: string; energy: number }
> = {
  triage: { color: "#E95F6A", seed: "triage", energy: 100 },
  gp: { color: "#118CFD", seed: "alex", energy: 95 },
  cardiology: { color: "#E95F6A", seed: "sarah", energy: 90 },
  mental_health: { color: "#8470BE", seed: "maya", energy: 88 },
  dermatology: { color: "#F7C543", seed: "priya", energy: 85 },
  orthopedic: { color: "#118CFD", seed: "james", energy: 87 },
  gastro: { color: "#12CA93", seed: "chen", energy: 92 },
  physiotherapy: { color: "#12CA93", seed: "emma", energy: 89 },
};

const dicebear = (seed: string) =>
  `https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=${seed}`;

const orbitalData = teamRoles.map((role, i) => {
  const agent = agentRegistry[role];
  const cfg = roleConfig[role];
  return {
    id: i + 1,
    title: agent.name,
    content: agent.description,
    avatar: dicebear(cfg.seed),
    energy: cfg.energy,
    color: cfg.color,
    specialties: agent.specialties.slice(0, 2),
  };
});

export function MeetTheTeam() {
  return (
    <section
      className="py-24 px-6"
      style={{
        background: "linear-gradient(160deg, #E8EDF2 0%, #DDD9E8 100%)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-6">
          <div>
            <p
              className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] uppercase mb-5"
              style={{ color: "#8896A8" }}
            >
              Your AI Care Team
            </p>
            <h2
              className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-[1.08]"
              style={{ color: "#12181B", letterSpacing: "-1.5px" }}
            >
              Eight specialists.
              <br />
              <span className="italic" style={{ color: "#8470BE" }}>
                One consultation.
              </span>
            </h2>
          </div>
          <p
            className="text-sm leading-relaxed md:max-w-[260px] md:text-right"
            style={{ color: "#637288" }}
          >
            Every case is reviewed by all relevant specialists simultaneously —
            not routed to just one.
          </p>
        </div>

        {/* Hint */}
        <p
          className="text-center font-[family-name:var(--font-mono)] mb-2"
          style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: "0.18em" }}
        >
          CLICK ANY SPECIALIST TO LEARN MORE
        </p>

        {/* Orbital container */}
        <div
          className="rounded-3xl relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 2px 24px rgba(0,0,0,0.05)",
          }}
        >
          <RadialOrbitalTimeline
            timelineData={orbitalData}
            centerColor="#118CFD"
          />
        </div>
      </div>
    </section>
  );
}
