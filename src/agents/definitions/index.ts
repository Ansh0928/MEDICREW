import { AgentDefinition, AgentRole } from "../types";
import { triageAgent } from "./triage";
import { gpAgent } from "./gp";
import { cardiologyAgent } from "./cardiology";
import { mentalHealthAgent } from "./mental-health";
import { dermatologyAgent } from "./dermatology";
import { orthopedicAgent } from "./orthopedic";
import { gastroAgent } from "./gastro";
import { physiotherapyAgent } from "./physiotherapy";

// Registry of all available agents
export const agentRegistry: Record<AgentRole, AgentDefinition> = {
  triage: triageAgent,
  gp: gpAgent,
  cardiology: cardiologyAgent,
  mental_health: mentalHealthAgent,
  dermatology: dermatologyAgent,
  orthopedic: orthopedicAgent,
  gastro: gastroAgent,
  physiotherapy: physiotherapyAgent,
  orchestrator: {
    role: "orchestrator",
    name: "MediCrew Coordinator",
    emoji: "🎯",
    description: "Coordinates the consultation flow between specialists",
    specialties: ["coordination", "synthesis", "recommendation"],
    systemPrompt: "You coordinate the MediCrew consultation process.",
  },
};

// Get agent by role
export const getAgent = (role: AgentRole): AgentDefinition => {
  return agentRegistry[role];
};

// Get all specialist agents (excluding triage and orchestrator)
export const getSpecialistAgents = (): AgentDefinition[] => {
  return Object.values(agentRegistry).filter(
    (agent) => !["triage", "orchestrator"].includes(agent.role)
  );
};

// Get relevant specialists based on keywords
export const getRelevantSpecialists = (symptoms: string): AgentRole[] => {
  const symptomLower = symptoms.toLowerCase();
  const relevantRoles: AgentRole[] = [];

  // Keyword mapping to specialties
  const keywordMap: Record<string, AgentRole[]> = {
    // Cardiology
    chest: ["cardiology", "gp"],
    heart: ["cardiology"],
    palpitation: ["cardiology"],
    "blood pressure": ["cardiology"],

    // Mental health
    anxiety: ["mental_health", "gp"],
    depress: ["mental_health", "gp"],
    stress: ["mental_health", "gp"],
    sleep: ["mental_health", "gp"],
    mood: ["mental_health"],
    panic: ["mental_health"],

    // Dermatology
    skin: ["dermatology"],
    rash: ["dermatology"],
    itch: ["dermatology"],
    acne: ["dermatology"],
    mole: ["dermatology"],

    // Orthopedic
    joint: ["orthopedic", "physiotherapy"],
    back: ["orthopedic", "physiotherapy"],
    knee: ["orthopedic", "physiotherapy"],
    shoulder: ["orthopedic", "physiotherapy"],
    muscle: ["orthopedic", "physiotherapy"],
    bone: ["orthopedic"],
    sprain: ["orthopedic", "physiotherapy"],

    // Physiotherapy specific
    physio: ["physiotherapy"],
    rehab: ["physiotherapy"],
    exercise: ["physiotherapy", "gp"],
    mobility: ["physiotherapy"],
    stiff: ["physiotherapy", "orthopedic"],
    posture: ["physiotherapy"],
    sports: ["physiotherapy", "orthopedic"],
    injury: ["physiotherapy", "orthopedic"],
    strain: ["physiotherapy"],
    flexibility: ["physiotherapy"],

    // Gastro
    stomach: ["gastro", "gp"],
    digest: ["gastro"],
    nausea: ["gastro", "gp"],
    vomit: ["gastro"],
    bowel: ["gastro"],
    diarrhea: ["gastro"],
    constipat: ["gastro"],
    acid: ["gastro"],
    heartburn: ["gastro"],
  };

  for (const [keyword, roles] of Object.entries(keywordMap)) {
    if (symptomLower.includes(keyword)) {
      roles.forEach((role) => {
        if (!relevantRoles.includes(role)) {
          relevantRoles.push(role);
        }
      });
    }
  }

  // Always include GP for general assessment
  if (!relevantRoles.includes("gp")) {
    relevantRoles.push("gp");
  }

  return relevantRoles;
};

export {
  triageAgent,
  gpAgent,
  cardiologyAgent,
  mentalHealthAgent,
  dermatologyAgent,
  orthopedicAgent,
  gastroAgent,
  physiotherapyAgent,
};
