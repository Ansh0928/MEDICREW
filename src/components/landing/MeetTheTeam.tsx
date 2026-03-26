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

const roleAccent: Record<string, string> = {
  triage:       "border-red-500/20 bg-red-500/5",
  gp:           "border-blue-500/20 bg-blue-500/5",
  cardiology:   "border-rose-500/20 bg-rose-500/5",
  mental_health:"border-violet-500/20 bg-violet-500/5",
  dermatology:  "border-amber-500/20 bg-amber-500/5",
  orthopedic:   "border-cyan-500/20 bg-cyan-500/5",
  gastro:       "border-emerald-500/20 bg-emerald-500/5",
  physiotherapy:"border-orange-500/20 bg-orange-500/5",
};

export function MeetTheTeam() {
  return (
    <section id="team" className="bg-[#050505] py-28 px-6 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="font-[family-name:var(--font-mono)] text-xs text-white/30 tracking-widest uppercase mb-4">
              Your AI Care Team
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-white leading-tight">
              Eight specialists.{" "}
              <span className="italic text-blue-300">One consultation.</span>
            </h2>
          </div>
          <p className="text-white/35 text-sm max-w-xs leading-relaxed">
            Every case is reviewed by all relevant specialists simultaneously — not routed to just one.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {teamRoles.map((role) => {
            const agent = agentRegistry[role];
            const accent = roleAccent[role] ?? "border-white/10 bg-white/[0.02]";
            return (
              <div
                key={role}
                className={`group relative rounded-2xl p-5 border ${accent} hover:scale-[1.02] transition-all duration-300 cursor-default`}
              >
                {/* Emoji */}
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {agent.emoji}
                </div>

                {/* Name */}
                <h3 className="text-white text-sm font-medium mb-1 leading-tight">
                  {agent.name}
                </h3>

                {/* Description */}
                <p className="text-white/35 text-xs leading-relaxed mb-4 line-clamp-2">
                  {agent.description}
                </p>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5">
                  {agent.specialties.slice(0, 2).map((s) => (
                    <span
                      key={s}
                      className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 border border-white/[0.08] rounded-full px-2 py-0.5 capitalize"
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
