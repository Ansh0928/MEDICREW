"use client";

import { agentRegistry } from "@/agents/definitions";
import { AgentRole } from "@/agents/types";

const teamRoles: AgentRole[] = ["triage", "gp", "cardiology", "mental_health", "dermatology", "orthopedic", "gastro", "physiotherapy"];

const roleConfig: Record<string, { color: string; seed: string }> = {
  triage:        { color: "#E95F6A", seed: "triage" },
  gp:            { color: "#118CFD", seed: "alex" },
  cardiology:    { color: "#E95F6A", seed: "sarah" },
  mental_health: { color: "#8470BE", seed: "maya" },
  dermatology:   { color: "#F7C543", seed: "priya" },
  orthopedic:    { color: "#118CFD", seed: "james" },
  gastro:        { color: "#12CA93", seed: "chen" },
  physiotherapy: { color: "#12CA93", seed: "emma" },
};

const dicebear = (seed: string) =>
  `https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=${seed}`;

export function MeetTheTeam() {
  return (
    <section id="team" className="py-28 px-6" style={{ background: "linear-gradient(25deg, #E1E7EA, #DCD9E7)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase mb-4" style={{ color: "#637288" }}>
              Your AI Care Team
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl leading-tight" style={{ color: "#12181B", letterSpacing: "-1px" }}>
              Eight specialists.{" "}
              <span className="italic" style={{ color: "#8470BE" }}>One consultation.</span>
            </h2>
          </div>
          <p className="text-sm max-w-xs leading-relaxed" style={{ color: "#637288" }}>
            Every case is reviewed by all relevant specialists simultaneously — not routed to just one.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {teamRoles.map((role) => {
            const agent = agentRegistry[role];
            const cfg = roleConfig[role] ?? { color: "#118CFD", seed: role };
            return (
              <div key={role}
                className="group relative rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-default"
                style={{ background: "rgba(255,255,255,0.75)", borderColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}>
                <div className="mb-4 flex items-center gap-3">
                  <img src={dicebear(cfg.seed)} alt={agent.name}
                    className="w-10 h-10 rounded-full border"
                    style={{ background: `${cfg.color}15`, borderColor: `${cfg.color}30` }} />
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.color }} />
                </div>
                <h3 className="text-sm font-medium mb-1 leading-tight" style={{ color: "#12181B" }}>{agent.name}</h3>
                <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: "#637288" }}>{agent.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.specialties.slice(0, 2).map((s) => (
                    <span key={s}
                      className="font-[family-name:var(--font-mono)] text-[10px] rounded-full px-2 py-0.5 capitalize"
                      style={{ color: cfg.color, background: `${cfg.color}12`, border: `1px solid ${cfg.color}25` }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
