"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { agentRegistry } from "@/agents/definitions";
import { AgentRole } from "@/agents/types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TeamPanelProps {
  activeAgents: AgentRole[];
  currentAgent?: AgentRole;
}

const specialists: AgentRole[] = [
  "triage",
  "gp",
  "cardiology",
  "mental_health",
  "dermatology",
  "orthopedic",
  "gastro",
  "physiotherapy",
];

export function TeamPanel({ activeAgents, currentAgent }: TeamPanelProps) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
        Your Care Team
      </h3>
      <div className="space-y-2">
        {specialists.map((role) => {
          const agent = agentRegistry[role];
          const isActive = activeAgents.includes(role);
          const isCurrent = currentAgent === role;

          return (
            <motion.div
              key={role}
              initial={{ opacity: 0.5 }}
              animate={{
                opacity: isActive ? 1 : 0.4,
                scale: isCurrent ? 1.02 : 1,
              }}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg transition-colors",
                isCurrent && "bg-primary/10",
                isActive && !isCurrent && "bg-muted/50"
              )}
            >
              <span className="text-xl">{agent.emoji}</span>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    !isActive && "text-muted-foreground"
                  )}
                >
                  {agent.name}
                </p>
              </div>
              {isCurrent && (
                <Badge variant="default" className="text-xs">
                  Active
                </Badge>
              )}
              {isActive && !isCurrent && (
                <Badge variant="outline" className="text-xs">
                  Done
                </Badge>
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
