"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
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

export function MeetTheTeam() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Meet Your AI Care Team
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Each consultation is reviewed by multiple AI specialists, working together to give you comprehensive guidance.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {teamRoles.map((role, index) => {
            const agent = agentRegistry[role];
            return (
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-5 h-full hover:shadow-lg transition-all hover:-translate-y-1 group">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl group-hover:scale-110 transition-transform">
                      {agent.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 truncate">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {agent.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {agent.specialties.slice(0, 2).map((specialty) => (
                          <Badge
                            key={specialty}
                            variant="secondary"
                            className="text-xs py-0"
                          >
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
