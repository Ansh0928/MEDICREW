"use client";
import { motion } from "framer-motion";
import { DoctorRole } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";

interface OrbState {
  role: DoctorRole;
  status: "waiting" | "active" | "done";
}

export function DoctorOrbRow({ orbs }: { orbs: OrbState[] }) {
  if (orbs.length === 0) return null;
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {orbs.map(({ role, status }) => {
        const agent = agentRegistry[role];
        return (
          <motion.div
            key={role}
            initial={{ scale: 0.8, opacity: 0.4 }}
            animate={{
              scale: status === "active" ? [1, 1.08, 1] : 1,
              opacity: status === "waiting" ? 0.35 : 1,
            }}
            transition={{
              repeat: status === "active" ? Infinity : 0,
              duration: 1.2,
            }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                status === "active"
                  ? "border-blue-400 bg-blue-950 shadow-[0_0_12px_#60a5fa80]"
                  : status === "done"
                  ? "border-green-500 bg-green-950"
                  : "border-gray-600 bg-gray-800"
              }`}
            >
              {status === "done" ? "✓" : agent?.emoji ?? "👤"}
            </div>
            <span
              className={`text-[10px] ${
                status === "active"
                  ? "text-blue-400"
                  : status === "done"
                  ? "text-green-400"
                  : "text-gray-500"
              }`}
            >
              {status === "active"
                ? "thinking"
                : status === "done"
                ? "done"
                : agent?.name.split(" ")[0]}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
