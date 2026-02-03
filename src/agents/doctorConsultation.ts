/**
 * Doctor Consultation Stream
 * 
 * Runs a multi-agent consultation (Triage → GP → Specialists → Summary) from the
 * doctor's perspective. Each agent discusses the case, and the final node produces
 * structured DoctorInsights + TreatmentPlanSuggestion.
 */

import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentMessage, AgentRole } from "./types";
import { agentRegistry, getRelevantSpecialists } from "./definitions";
import type {
  SymptomCheck,
  DoctorInsights,
  TreatmentPlanSuggestion,
} from "@/types/doctors-patients";

// Doctor consultation state
const DoctorConsultationAnnotation = Annotation.Root({
  symptomCheck: Annotation<SymptomCheck>,
  messages: Annotation<AgentMessage[]>({
    default: () => [],
    reducer: (current, update) => [...current, ...update],
  }),
  redFlags: Annotation<string[]>({
    default: () => [],
    reducer: (current, update) => [...new Set([...current, ...update])],
  }),
  relevantSpecialties: Annotation<AgentRole[]>({
    default: () => [],
    reducer: (current, update) => [...new Set([...current, ...update])],
  }),
  doctorSummary: Annotation<{
    insights: DoctorInsights;
    treatmentPlan: TreatmentPlanSuggestion;
  } | undefined>,
  sessionId: Annotation<string>,
  currentStep: Annotation<string>,
});

type DoctorConsultationState = typeof DoctorConsultationAnnotation.State;

const createLLM = () => {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.3,
    apiKey: process.env.GOOGLE_API_KEY,
  });
};

// Format symptom check for prompts
function formatSymptomCheck(sc: SymptomCheck): string {
  return `Patient: ${sc.patientName}
Symptoms: ${sc.symptoms.join(", ")}
Duration: ${sc.duration}
Additional Info: ${sc.additionalInfo || "None"}
Current AI Triage: ${sc.aiAssessment.urgencyLevel} urgency
Possible Conditions (from initial triage): ${sc.aiAssessment.possibleConditions.join(", ")}`;
}

// Triage node - doctor-facing assessment
async function doctorTriageNode(
  state: DoctorConsultationState
): Promise<Partial<DoctorConsultationState>> {
  const llm = createLLM();
  const agent = agentRegistry.triage;
  const sc = state.symptomCheck;

  const response = await llm.invoke([
    new SystemMessage(`${agent.systemPrompt}

You are advising a colleague (another doctor). Focus on:
- Clinical urgency and reasoning
- Red flags to watch for
- Which specialists should weigh in`),
    new HumanMessage(`
${formatSymptomCheck(sc)}

Please provide your triage assessment for this case. Be concise and clinical.
Include: urgency level, key red flags, and which specialties should be consulted.
`),
  ]);

  const content = response.content as string;

  // Extract red flags and specialties from response
  const redFlags: string[] = [];
  const redFlagMatch = content.match(/red flags?:?\s*([^\n]+)/i);
  if (redFlagMatch) {
    redFlags.push(...redFlagMatch[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean));
  }

  const relevantSpecialties = getRelevantSpecialists(sc.symptoms.join(" ")) as AgentRole[];

  const agentMessage: AgentMessage = {
    role: "triage",
    agentName: agent.name,
    content,
    timestamp: new Date(),
  };

  return {
    messages: [agentMessage],
    redFlags,
    relevantSpecialties,
    currentStep: "gp",
  };
}

// GP node - doctor-facing assessment
async function doctorGpNode(
  state: DoctorConsultationState
): Promise<Partial<DoctorConsultationState>> {
  const llm = createLLM();
  const agent = agentRegistry.gp;
  const sc = state.symptomCheck;

  const previousMessages = state.messages
    .map((m) => `**${m.agentName}:** ${m.content}`)
    .join("\n\n");

  const response = await llm.invoke([
    new SystemMessage(`${agent.systemPrompt}

You are advising a colleague. Focus on:
- Differential diagnosis considerations
- Key history points to clarify
- Initial workup recommendations`),
    new HumanMessage(`
${formatSymptomCheck(sc)}

**Team discussion so far:**
${previousMessages}

As the GP, provide your clinical perspective. What's your differential? What would you want to rule out?
`),
  ]);

  const agentMessage: AgentMessage = {
    role: "gp",
    agentName: agent.name,
    content: response.content as string,
    timestamp: new Date(),
  };

  return {
    messages: [agentMessage],
    currentStep: "specialist",
  };
}

// Specialist node - runs relevant specialists
async function doctorSpecialistNode(
  state: DoctorConsultationState
): Promise<Partial<DoctorConsultationState>> {
  const llm = createLLM();
  const messages: AgentMessage[] = [];
  const sc = state.symptomCheck;

  const specialistsToConsult = state.relevantSpecialties.filter(
    (role) => !["gp", "triage", "orchestrator"].includes(role)
  );

  const previousMessages = state.messages
    .map((m) => `**${m.agentName}:** ${m.content}`)
    .join("\n\n");

  for (const specialtyRole of specialistsToConsult.slice(0, 2)) {
    const agent = agentRegistry[specialtyRole];
    if (!agent) continue;

    const response = await llm.invoke([
      new SystemMessage(`${agent.systemPrompt}

You are advising a colleague. Focus on:
- Specialty-specific differentials
- Recommended tests within your domain
- Red flags specific to your specialty`),
      new HumanMessage(`
${formatSymptomCheck(sc)}

**Team discussion so far:**
${previousMessages}

As the ${agent.name}, what's your specialist take? Any specific concerns or recommended investigations?
`),
    ]);

    messages.push({
      role: specialtyRole,
      agentName: agent.name,
      content: response.content as string,
      timestamp: new Date(),
    });
  }

  return {
    messages,
    currentStep: "summary",
  };
}

// Summary node - produces structured DoctorInsights + TreatmentPlanSuggestion
async function doctorSummaryNode(
  state: DoctorConsultationState
): Promise<Partial<DoctorConsultationState>> {
  const llm = createLLM();
  const sc = state.symptomCheck;

  const allAssessments = state.messages
    .map((m) => `### ${m.agentName}\n${m.content}`)
    .join("\n\n");

  const response = await llm.invoke([
    new SystemMessage(`You are the MediCrew coordinator synthesizing the team discussion for a colleague (doctor).

Output a JSON object with two parts:
1. "insights": { "differentialDiagnosis": [...], "recommendedTests": [...], "redFlags": [...], "aiConfidence": number }
2. "treatmentPlan": { "medications": [...], "lifestyle": [...], "followUp": "..." }

Be clinical and actionable. The doctor will use this to inform their diagnosis.`),
    new HumanMessage(`
${formatSymptomCheck(sc)}

## Team Discussion:
${allAssessments}

Red flags identified: ${state.redFlags.join(", ") || "None"}

Synthesize this into structured insights and a treatment plan suggestion.
Respond with JSON only.
`),
  ]);

  let doctorSummary: {
    insights: DoctorInsights;
    treatmentPlan: TreatmentPlanSuggestion;
  };

  try {
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      doctorSummary = {
        insights: {
          differentialDiagnosis: parsed.insights?.differentialDiagnosis || 
            sc.aiAssessment.possibleConditions,
          recommendedTests: parsed.insights?.recommendedTests || 
            ["Physical examination", "Vital signs"],
          redFlags: parsed.insights?.redFlags || state.redFlags,
          aiConfidence: parsed.insights?.aiConfidence || sc.aiAssessment.confidence,
        },
        treatmentPlan: {
          medications: parsed.treatmentPlan?.medications || 
            ["Symptomatic treatment as needed"],
          lifestyle: parsed.treatmentPlan?.lifestyle || 
            ["Rest", "Adequate hydration", "Monitor symptoms"],
          followUp: parsed.treatmentPlan?.followUp || 
            "Schedule follow-up in 1-2 weeks or sooner if symptoms worsen.",
        },
      };
    } else {
      throw new Error("No JSON found");
    }
  } catch {
    // Fallback
    doctorSummary = {
      insights: {
        differentialDiagnosis: sc.aiAssessment.possibleConditions,
        recommendedTests: ["Physical examination", "Vital signs", "Basic metabolic panel"],
        redFlags: state.redFlags,
        aiConfidence: sc.aiAssessment.confidence,
      },
      treatmentPlan: {
        medications: ["Symptomatic treatment as needed"],
        lifestyle: ["Rest", "Adequate hydration", "Monitor symptoms"],
        followUp: "Schedule follow-up in 1-2 weeks or sooner if symptoms worsen.",
      },
    };
  }

  const agentMessage: AgentMessage = {
    role: "orchestrator",
    agentName: "MediCrew Coordinator",
    content: `**Summary:** Based on the team discussion, the most likely differentials are: ${doctorSummary.insights.differentialDiagnosis.join(", ")}. Recommended tests: ${doctorSummary.insights.recommendedTests.join(", ")}.`,
    timestamp: new Date(),
  };

  return {
    messages: [agentMessage],
    doctorSummary,
    currentStep: "complete",
  };
}

// Router functions
function routeAfterTriage(state: DoctorConsultationState): string {
  return "gp";
}

function routeAfterGp(state: DoctorConsultationState): string {
  const specialists = state.relevantSpecialties.filter(
    (role) => !["gp", "triage", "orchestrator"].includes(role)
  );
  if (specialists.length > 0) {
    return "specialist";
  }
  return "summary";
}

// Build the doctor consultation graph
export function createDoctorConsultationGraph() {
  const graph = new StateGraph(DoctorConsultationAnnotation)
    .addNode("triage", doctorTriageNode)
    .addNode("gp", doctorGpNode)
    .addNode("specialist", doctorSpecialistNode)
    .addNode("summary", doctorSummaryNode)
    .addEdge(START, "triage")
    .addConditionalEdges("triage", routeAfterTriage, {
      gp: "gp",
    })
    .addConditionalEdges("gp", routeAfterGp, {
      specialist: "specialist",
      summary: "summary",
    })
    .addEdge("specialist", "summary")
    .addEdge("summary", END);

  return graph.compile();
}

// Streaming doctor consultation
export async function* streamDoctorConsultation(
  symptomCheck: SymptomCheck
): AsyncGenerator<{
  step: string;
  data: {
    messages?: AgentMessage[];
    doctorSummary?: {
      insights: DoctorInsights;
      treatmentPlan: TreatmentPlanSuggestion;
    };
  };
}> {
  const graph = createDoctorConsultationGraph();

  const initialState = {
    symptomCheck,
    messages: [],
    redFlags: [],
    relevantSpecialties: [],
    sessionId: crypto.randomUUID(),
    currentStep: "triage",
  };

  for await (const event of await graph.stream(initialState)) {
    const [nodeName, nodeOutput] = Object.entries(event)[0] as [
      string,
      Partial<DoctorConsultationState>
    ];
    yield {
      step: nodeName,
      data: {
        messages: nodeOutput.messages,
        doctorSummary: nodeOutput.doctorSummary,
      },
    };
  }
}
