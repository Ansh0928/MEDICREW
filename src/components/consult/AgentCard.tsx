"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentMessage } from "@/agents/types";
import { agentRegistry } from "@/agents/definitions";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AgentCardProps {
  message: AgentMessage;
  isLatest?: boolean;
}

export function AgentCard({ message, isLatest }: AgentCardProps) {
  const agent = agentRegistry[message.role];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "p-4 border-l-4 transition-all",
          isLatest && "ring-2 ring-primary/20",
          message.role === "triage" && "border-l-orange-500",
          message.role === "gp" && "border-l-blue-500",
          message.role === "cardiology" && "border-l-red-500",
          message.role === "mental_health" && "border-l-purple-500",
          message.role === "dermatology" && "border-l-pink-500",
          message.role === "orthopedic" && "border-l-amber-500",
          message.role === "gastro" && "border-l-green-500",
          message.role === "orchestrator" && "border-l-primary"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">{agent?.emoji || "👨‍⚕️"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-foreground">
                {message.agentName}
              </span>
              <Badge variant="outline" className="text-xs">
                {agent?.role || message.role}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
