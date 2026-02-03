"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { agentRegistry } from "@/agents/definitions";
import { AgentRole } from "@/agents/types";

interface AgentThinkingProps {
  currentStep: string;
  activeAgents?: AgentRole[];
}

// Detailed thinking steps for each agent phase
const thinkingSteps: Record<string, string[]> = {
  triage: [
    "📋 Analyzing symptom patterns...",
    "🔍 Checking for red flag indicators...",
    "⚠️ Assessing urgency level...",
    "🏥 Determining care pathway...",
  ],
  gp: [
    "👨‍⚕️ Reviewing patient history context...",
    "🩺 Correlating symptoms with conditions...",
    "📊 Evaluating differential diagnoses...",
    "💊 Considering treatment approaches...",
    "✍️ Formulating clinical assessment...",
  ],
  specialist: [
    "🧠 Consulting specialist knowledge base...",
    "🔬 Analyzing from specialist perspective...",
    "📋 Cross-referencing with GP assessment...",
    "💡 Identifying specialty-specific insights...",
  ],
  recommend: [
    "📝 Synthesizing all assessments...",
    "🎯 Prioritizing recommendations...",
    "📅 Determining care timeline...",
    "✅ Finalizing guidance...",
  ],
};

const stepTitles: Record<string, string> = {
  triage: "Triage Assessment",
  gp: "GP Consultation",
  specialist: "Specialist Review",
  recommend: "Care Recommendation",
};

export function AgentThinking({ currentStep, activeAgents }: AgentThinkingProps) {
  const [currentThinkingIndex, setCurrentThinkingIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = thinkingSteps[currentStep] || ["Processing..."];
  const title = stepTitles[currentStep] || "Processing";

  // Cycle through thinking steps
  useEffect(() => {
    setCurrentThinkingIndex(0);
    setCompletedSteps([]);

    const interval = setInterval(() => {
      setCurrentThinkingIndex((prev) => {
        const next = prev + 1;
        if (next < steps.length) {
          setCompletedSteps((completed) => [...completed, prev]);
          return next;
        }
        return prev;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [currentStep, steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-5 border border-blue-100 dark:border-blue-900"
    >
      {/* Header with agent avatars */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {activeAgents?.slice(0, 3).map((role, index) => (
              <motion.div
                key={role}
                initial={{ scale: 0, x: -10 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 flex items-center justify-center text-xl shadow-sm"
              >
                {agentRegistry[role]?.emoji || "👨‍⚕️"}
              </motion.div>
            ))}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
              {title}
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              {activeAgents?.map(r => agentRegistry[r]?.name).join(", ") || "AI Team"}
            </p>
          </div>
        </div>

        {/* Animated brain/thinking indicator */}
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-2xl"
        >
          🧠
        </motion.div>
      </div>

      {/* Thinking steps - like Manus AI */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isCurrent = index === currentThinkingIndex;
            const isPending = index > currentThinkingIndex;

            return (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isPending ? 0.4 : 1,
                  x: 0,
                }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 text-sm ${isCompleted
                    ? "text-green-600 dark:text-green-400"
                    : isCurrent
                      ? "text-blue-700 dark:text-blue-300 font-medium"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
              >
                {/* Status indicator */}
                <div className="w-5 h-5 flex items-center justify-center">
                  {isCompleted ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-green-500"
                    >
                      ✓
                    </motion.span>
                  ) : isCurrent ? (
                    <motion.div
                      className="w-3 h-3 rounded-full bg-blue-500"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                  )}
                </div>

                {/* Step text */}
                <span>{step}</span>

                {/* Loading dots for current step */}
                {isCurrent && (
                  <motion.div className="flex gap-1 ml-auto">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 bg-blue-100 dark:bg-blue-900 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
          initial={{ width: "0%" }}
          animate={{
            width: `${((currentThinkingIndex + 1) / steps.length) * 100}%`
          }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}
