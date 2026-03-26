"use client";

import { agentRegistry } from "@/agents/definitions";
import { AgentRole } from "@/agents/types";

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

const roleConfig: Record<string, { color: string; glow: string; border: string; seed: string }> = {
  triage:        { color: "#fb923c", glow: "rgba(251,146,60,0.08)",   border: "rgba(251,146,60,0.25)",  seed: "triage" },
  gp:            { color: "#818cf8", glow: "rgba(129,140,248,0.08)",  border: "rgba(129,140,248,0.25)", seed: "alex" },
  cardiology:    { color: "#f472b6", glow: "rgba(244,114,182,0.08)",  border: "rgba(244,114,182,0.25)", seed: "sarah" },
  mental_health: { color: "#a78bfa", glow: "rgba(167,139,250,0.08)",  border: "rgba(167,139,250,0.25)", seed: "maya" },
  dermatology:   { color: "#fbbf24", glow: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.25)",  seed: "priya" },
  orthopedic:    { color: "#67e8f9", glow: "rgba(103,232,249,0.08)",  border: "rgba(103,232,249,0.25)", seed: "james" },
  gastro:        { color: "#34d399", glow: "rgba(52,211,153,0.08)",   border: "rgba(52,211,153,0.25)",  seed: "chen" },
  physiotherapy: { color: "#fb923c", glow: "rgba(251,146,60,0.08)",   border: "rgba(251,146,60,0.25)",  seed: "emma" },
};

const dicebear = (seed: string) =>
  `https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=${seed}`;

export function MeetTheTeam() {
  return (
    <section id="team" className="py-28 px-6 border-t border-white/[0.04]" style={{ background: "#060614" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="font-[family-name:var(--font-mono)] text-xs text-violet-400/60 tracking-widest uppercase mb-4">
              Your AI Care Team
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight">
              Eight specialists.{" "}
              <span className="italic" style={{ background: "linear-gradient(135deg, #a78bfa, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                One consultation.
              </span>
            </h2>
          </div>
          <p className="text-white/35 text-sm max-w-xs leading-relaxed">
            Every case is reviewed by all relevant specialists simultaneously — not routed to just one.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {teamRoles.map((role) => {
            const agent = agentRegistry[role];
            const cfg = roleConfig[role] ?? { color: "#818cf8", glow: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.2)", seed: role };
            return (
              <div
                key={role}
                className="group relative rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.03] cursor-default"
                style={{ background: cfg.glow, borderColor: cfg.border }}
              >
                {/* Dicebear avatar */}
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src={dicebear(cfg.seed)}
                    alt={agent.name}
                    className="w-10 h-10 rounded-full"
                    style={{ background: `${cfg.color}20` }}
                  />
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: cfg.color }}
                  />
                </div>

                <h3 className="text-white text-sm font-medium mb-1 leading-tight">
                  {agent.name}
                </h3>
                <p className="text-white/35 text-xs leading-relaxed mb-4 line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {agent.specialties.slice(0, 2).map((s) => (
                    <span
                      key={s}
                      className="font-[family-name:var(--font-mono)] text-[10px] rounded-full px-2 py-0.5 capitalize"
                      style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}
                    >
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
