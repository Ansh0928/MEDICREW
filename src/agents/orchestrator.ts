import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import {
  ConsultationState,
  AgentMessage,
  AgentRole,
  UrgencyLevel,
  CareRecommendation,
  TriageOutputSchema,
  SpecialistOutputSchema,
} from "./types";
import { agentRegistry, getRelevantSpecialists } from "./definitions";

// Define the state annotation for LangGraph
const ConsultationAnnotation = Annotation.Root({
  symptoms: Annotation<string>,
  additionalInfo: Annotation<string[]>({
    default: () => [],
    reducer: (current, update) => [...current, ...update],
  }),
  messages: Annotation<AgentMessage[]>({
    default: () => [],
    reducer: (current, update) => [...current, ...update],
  }),
  urgencyLevel: Annotation<UrgencyLevel | undefined>,
  redFlags: Annotation<string[]>({
    default: () => [],
    reducer: (current, update) => [...new Set([...current, ...update])],
  }),
  relevantSpecialties: Annotation<AgentRole[]>({
    default: () => [],
    reducer: (current, update) => [...new Set([...current, ...update])],
  }),
  recommendation: Annotation<CareRecommendation | undefined>,
  sessionId: Annotation<string>,
  startedAt: Annotation<Date>,
  currentStep: Annotation<string>,
});

type ConsultationGraphState = typeof ConsultationAnnotation.State;

// Create the LLM instance
const createLLM = () => {
  return new ChatGoogleGenerativeAI({
    model: "gemini-pro",
    temperature: 0.3,
    apiKey: process.env.GOOGLE_API_KEY,
  });
};

// Triage node - assesses urgency and identifies red flags
async function triageNode(state: ConsultationGraphState): Promise<Partial<ConsultationGraphState>> {
  const llm = createLLM();
  const agent = agentRegistry.triage;

  const response = await llm.invoke([
    new SystemMessage(agent.systemPrompt),
    new HumanMessage(`
Patient symptoms: ${state.symptoms}
${state.additionalInfo.length > 0 ? `Additional information: ${state.additionalInfo.join(", ")}` : ""}

Please provide a structured triage assessment in the following JSON format:
{
  "urgencyLevel": "emergency" | "urgent" | "routine" | "self_care",
  "reasoning": "your reasoning here",
  "redFlags": ["list of red flags identified"],
  "relevantSpecialties": ["list of relevant medical specialties"]
}
`),
  ]);

  // Parse the response
  let triageResult: {
    urgencyLevel: UrgencyLevel;
    reasoning: string;
    redFlags: string[];
    relevantSpecialties: string[];
  } = {
    urgencyLevel: "routine" as UrgencyLevel,
    reasoning: response.content as string,
    redFlags: [],
    relevantSpecialties: getRelevantSpecialists(state.symptoms) as string[],
  };

  try {
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = TriageOutputSchema.parse(JSON.parse(jsonMatch[0]));
      triageResult = {
        urgencyLevel: parsed.urgencyLevel as UrgencyLevel,
        reasoning: parsed.reasoning,
        redFlags: parsed.redFlags,
        relevantSpecialties: parsed.relevantSpecialties,
      };
    }
  } catch {
    // Keep the default value if parsing fails
  }

  const agentMessage: AgentMessage = {
    role: "triage",
    agentName: agent.name,
    content: triageResult.reasoning,
    timestamp: new Date(),
  };

  return {
    urgencyLevel: triageResult.urgencyLevel as UrgencyLevel,
    redFlags: triageResult.redFlags,
    relevantSpecialties: triageResult.relevantSpecialties as AgentRole[],
    messages: [agentMessage],
    currentStep: "specialist_consultation",
  };
}

// GP consultation node
async function gpNode(state: ConsultationGraphState): Promise<Partial<ConsultationGraphState>> {
  const llm = createLLM();
  const agent = agentRegistry.gp;

  const previousMessages = state.messages
    .map((m) => `${m.agentName}: ${m.content}`)
    .join("\n\n");

  const response = await llm.invoke([
    new SystemMessage(agent.systemPrompt),
    new HumanMessage(`
Patient symptoms: ${state.symptoms}
${state.additionalInfo.length > 0 ? `Additional information: ${state.additionalInfo.join(", ")}` : ""}

Triage assessment: ${state.urgencyLevel} urgency
${state.redFlags.length > 0 ? `Red flags identified: ${state.redFlags.join(", ")}` : "No red flags identified"}

Previous assessments:
${previousMessages}

Please provide your GP assessment, focusing on the overall picture and any additional considerations.
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
  };
}

// Specialist consultation node (runs relevant specialists in parallel conceptually)
async function specialistNode(state: ConsultationGraphState): Promise<Partial<ConsultationGraphState>> {
  const llm = createLLM();
  const messages: AgentMessage[] = [];

  // Get specialists that should be consulted (excluding GP and triage)
  const specialistsToConsult = state.relevantSpecialties.filter(
    (role) => !["gp", "triage", "orchestrator"].includes(role)
  );

  // Run specialist consultations
  for (const specialtyRole of specialistsToConsult.slice(0, 2)) {
    // Limit to 2 specialists
    const agent = agentRegistry[specialtyRole];
    if (!agent) continue;

    const previousMessages = state.messages
      .map((m) => `${m.agentName}: ${m.content}`)
      .join("\n\n");

    const response = await llm.invoke([
      new SystemMessage(agent.systemPrompt),
      new HumanMessage(`
Patient symptoms: ${state.symptoms}
${state.additionalInfo.length > 0 ? `Additional information: ${state.additionalInfo.join(", ")}` : ""}

Triage assessment: ${state.urgencyLevel} urgency
${state.redFlags.length > 0 ? `Red flags identified: ${state.redFlags.join(", ")}` : ""}

Previous assessments from the care team:
${previousMessages}

As the ${agent.name}, please provide your specialist perspective on these symptoms.
Focus on aspects relevant to your specialty and any specific recommendations.
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
    currentStep: "generating_recommendation",
  };
}

// Final recommendation node - synthesizes all inputs
async function recommendationNode(state: ConsultationGraphState): Promise<Partial<ConsultationGraphState>> {
  const llm = createLLM();

  const allAssessments = state.messages
    .map((m) => `### ${m.agentName}\n${m.content}`)
    .join("\n\n");

  const response = await llm.invoke([
    new SystemMessage(`You are the MediCrew coordinator. Your job is to synthesize all the specialist inputs and provide a clear, actionable recommendation for the patient.

IMPORTANT: Always include the medical disclaimer that this is health navigation guidance, not a medical diagnosis, and the patient should see a real healthcare provider.`),
    new HumanMessage(`
Patient symptoms: ${state.symptoms}
Urgency level: ${state.urgencyLevel}
${state.redFlags.length > 0 ? `Red flags: ${state.redFlags.join(", ")}` : ""}

## Team Assessments:
${allAssessments}

Please provide a final recommendation in JSON format:
{
  "urgency": "${state.urgencyLevel}",
  "summary": "A clear, empathetic summary of the situation",
  "nextSteps": ["Step 1", "Step 2", "Step 3"],
  "questionsForDoctor": ["Question 1 to ask your doctor", "Question 2"],
  "specialistType": "Type of specialist to see if applicable",
  "timeframe": "When to seek care (e.g., 'within 24 hours', 'this week')"
}
`),
  ]);

  let recommendation: CareRecommendation;
  try {
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      recommendation = {
        ...parsed,
        disclaimer:
          "This guidance is for health navigation purposes only and does not constitute medical advice. Please consult a qualified healthcare provider for proper diagnosis and treatment.",
      };
    } else {
      throw new Error("No JSON found");
    }
  } catch {
    recommendation = {
      urgency: state.urgencyLevel || "routine",
      summary: response.content as string,
      nextSteps: ["Consult with your GP for proper assessment"],
      questionsForDoctor: [],
      timeframe: "At your earliest convenience",
      disclaimer:
        "This guidance is for health navigation purposes only and does not constitute medical advice. Please consult a qualified healthcare provider for proper diagnosis and treatment.",
    };
  }

  const agentMessage: AgentMessage = {
    role: "orchestrator",
    agentName: "MediCrew Coordinator",
    content: recommendation.summary,
    timestamp: new Date(),
  };

  return {
    recommendation,
    messages: [agentMessage],
    currentStep: "complete",
  };
}

// Router function to determine next step
function routeAfterTriage(state: ConsultationGraphState): string {
  // If emergency, go straight to recommendation
  if (state.urgencyLevel === "emergency") {
    return "recommend";
  }
  // Otherwise, consult GP and specialists
  return "gp";
}

function routeAfterGP(state: ConsultationGraphState): string {
  // If there are relevant specialists, consult them
  const specialists = state.relevantSpecialties.filter(
    (role) => !["gp", "triage", "orchestrator"].includes(role)
  );
  if (specialists.length > 0) {
    return "specialist";
  }
  // Otherwise, go to recommendation
  return "recommend";
}

// Build the consultation graph
export function createConsultationGraph() {
  const graph = new StateGraph(ConsultationAnnotation)
    .addNode("triage", triageNode)
    .addNode("gp", gpNode)
    .addNode("specialist", specialistNode)
    .addNode("recommend", recommendationNode)
    .addEdge(START, "triage")
    .addConditionalEdges("triage", routeAfterTriage, {
      gp: "gp",
      recommend: "recommend",
    })
    .addConditionalEdges("gp", routeAfterGP, {
      specialist: "specialist",
      recommend: "recommend",
    })
    .addEdge("specialist", "recommend")
    .addEdge("recommend", END);

  return graph.compile();
}

// Main consultation function
export async function runConsultation(
  symptoms: string,
  sessionId?: string
): Promise<ConsultationState> {
  const graph = createConsultationGraph();

  const initialState = {
    symptoms,
    additionalInfo: [],
    messages: [],
    redFlags: [],
    relevantSpecialties: [],
    sessionId: sessionId || crypto.randomUUID(),
    startedAt: new Date(),
    currentStep: "triage",
  };

  const result = await graph.invoke(initialState);

  return result as ConsultationState;
}

// Stream consultation for real-time updates
export async function* streamConsultation(
  symptoms: string,
  sessionId?: string
): AsyncGenerator<{ step: string; data: Partial<ConsultationState> }> {
  const graph = createConsultationGraph();

  const initialState = {
    symptoms,
    additionalInfo: [],
    messages: [],
    redFlags: [],
    relevantSpecialties: [],
    sessionId: sessionId || crypto.randomUUID(),
    startedAt: new Date(),
    currentStep: "triage",
  };

  for await (const event of await graph.stream(initialState)) {
    const [nodeName, nodeOutput] = Object.entries(event)[0];
    yield {
      step: nodeName,
      data: nodeOutput as Partial<ConsultationState>,
    };
  }
}
