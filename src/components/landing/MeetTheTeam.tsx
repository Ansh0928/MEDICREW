"use client";

import { agentRegistry } from "@/agents/definitions";
import { AgentRole } from "@/agents/types";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";

const teamRoles: AgentRole[] = [
  "triage", "gp", "cardiology", "mental_health",
  "dermatology", "orthopedic", "gastro", "physiotherapy",
];

const roleConfig: Record<string, { color: string; seed: string; energy: number }> = {
  triage:        { color: "#E95F6A", seed: "triage",  energy: 100 },
  gp:            { color: "#118CFD", seed: "alex",    energy: 95  },
  cardiology:    { color: "#E95F6A", seed: "sarah",   energy: 90  },
  mental_health: { color: "#8470BE", seed: "maya",    energy: 88  },
  dermatology:   { color: "#F7C543", seed: "priya",   energy: 85  },
  orthopedic:    { color: "#118CFD", seed: "james",   energy: 87  },
  gastro:        { color: "#12CA93", seed: "chen",    energy: 92  },
  physiotherapy: { color: "#12CA93", seed: "emma",    energy: 89  },
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
    category: role,
    avatar: dicebear(cfg.seed),
    relatedIds: [],
    energy: cfg.energy,
    color: cfg.color,
    specialties: agent.specialties.slice(0, 2),
  };
});

export function MeetTheTeam() {
  return (
    <section
      id="team"
      className="py-28 px-6"
      style={{ background: "linear-gradient(25deg, #E1E7EA, #DCD9E7)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <p
              className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4"
              style={{ color: "#637288" }}
            >
              Your AI Care Team
            </p>
            <h2
              className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight"
              style={{ color: "#12181B", letterSpacing: "-1px" }}
            >
              Eight specialists.{" "}
              <span className="italic" style={{ color: "#8470BE" }}>
                One consultation.
              </span>
            </h2>
          </div>
          <p className="text-sm max-w-xs leading-relaxed" style={{ color: "#637288" }}>
            Every case is reviewed by all relevant specialists simultaneously — not routed to just one.
          </p>
        </div>

        <p
          className="font-[family-name:var(--font-mono)] text-[10px] text-center tracking-widest uppercase mb-2 opacity-40"
          style={{ color: "#637288" }}
        >
          Click a specialist to learn more
        </p>

        {/* Orbital constellation — full visual */}
        <div
          className="rounded-3xl relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.40)",
            border: "1px solid rgba(255,255,255,0.85)",
            backdropFilter: "blur(10px)",
          }}
        >
          <RadialOrbitalTimeline timelineData={orbitalData} centerColor="#118CFD" />
        </div>
      </div>
    </section>
  );
}
