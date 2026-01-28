"use client";

import { motion } from "framer-motion";
import { agentRegistry } from "@/agents/definitions";
import { AgentRole } from "@/agents/types";

interface AgentThinkingProps {
  currentStep: string;
  activeAgents?: AgentRole[];
}

const stepMessages: Record<string, string> = {
  triage: "Triage Specialist is assessing urgency...",
  gp: "Dr. Alex (GP) is reviewing your symptoms...",
  specialist: "Specialists are consulting...",
  recommend: "Preparing your care recommendation...",
};

export function AgentThinking({ currentStep, activeAgents }: AgentThinkingProps) {
  const message = stepMessages[currentStep] || "Processing...";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg"
    >
      <div className="flex -space-x-2">
        {activeAgents?.slice(0, 3).map((role) => (
          <motion.div
            key={role}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-8 h-8 rounded-full bg-background border-2 border-background flex items-center justify-center text-lg"
          >
            {agentRegistry[role]?.emoji || "👨‍⚕️"}
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{message}</span>
        <motion.div
          className="flex gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-primary rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
