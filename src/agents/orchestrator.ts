import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createModel } from "@/lib/ai/config";
import {
  ConsultationState,
  AgentMessage,
  AgentRole,
  UrgencyLevel,
  CareRecommendation,
  TriageOutputSchema,
} from "./types";
import { agentRegistry, getRelevantSpecialists } from "./definitions";
import { getCheckpointer } from "@/lib/checkpointer";

// Extended stream event with agent identity metadata and token-level streaming
export interface StreamEvent {
  step: string;
  data: Partial<ConsultationState>;
  agentName?: string;
  agentRole?: string;
  specialty?: string;
  eventType?: 'node_output' | 'token_delta' | 'routing' | 'complete';
  delta?: string; // Token-level text chunk for progressive streaming
}

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

// Create the LLM instance - uses configured provider (Groq or Ollama)
const createLLM = () => {
  return createModel(0.3);
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

  // Run specialist consultations in parallel (limit to 2)
  const previousMessages = state.messages
    .map((m) => `${m.agentName}: ${m.content}`)
    .join("\n\n");

  const results = await Promise.all(
    specialistsToConsult.slice(0, 2).map(async (specialtyRole) => {
      const agent = agentRegistry[specialtyRole];
      if (!agent) return null;

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

      return {
        role: specialtyRole,
        agentName: agent.name,
        content: response.content as string,
        timestamp: new Date(),
      };
    })
  );

  for (const msg of results) {
    if (msg) messages.push(msg);
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
    agentName: "MediCrew AI — Coordinator",
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createConsultationGraph(checkpointer?: any) {
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

  return checkpointer ? graph.compile({ checkpointer }) : graph.compile();
}

// Main consultation function
export async function runConsultation(
  symptoms: string,
  sessionId?: string,
  consultationId?: string,
  patientContext?: string
): Promise<ConsultationState> {
  let graph;
  let invokeConfig: { configurable?: { thread_id: string } } | undefined;

  if (consultationId && process.env.DIRECT_URL) {
    const cp = await getCheckpointer();
    graph = createConsultationGraph(cp);
    invokeConfig = { configurable: { thread_id: `consultation-${consultationId}` } };
  } else {
    graph = createConsultationGraph();
  }

  const enrichedSymptoms = patientContext
    ? `${patientContext}\n\nCurrent symptoms: ${symptoms}`
    : symptoms;

  const initialState = {
    symptoms: enrichedSymptoms,
    additionalInfo: [],
    messages: [],
    redFlags: [],
    relevantSpecialties: [],
    sessionId: sessionId || crypto.randomUUID(),
    startedAt: new Date(),
    currentStep: "triage",
  };

  const result = await graph.invoke(initialState, invokeConfig);

  return result as ConsultationState;
}

// Stream consultation for real-time updates with agent identity metadata and token-level streaming.
// Uses graph.streamEvents() (LangGraph v2 API) to emit:
//   - token_delta events with per-token delta text (CONS-02: progressive streaming)
//   - node_output events with full node output and agent identity (CONS-01: who is speaking)
//   - routing event after triage with relevant specialists (CONS-03: routing display)
// consultationId enables PostgresSaver checkpointing (exit-mode — no interruptBefore/After)
// patientContext is prepended to symptoms for profile-aware consultations (PROF-02)
export async function* streamConsultation(
  symptoms: string,
  sessionId?: string,
  consultationId?: string,
  patientContext?: string
): AsyncGenerator<StreamEvent> {
  let graph;
  let streamConfig: { configurable?: { thread_id: string } } | undefined;

  if (consultationId && process.env.DIRECT_URL) {
    const cp = await getCheckpointer();
    graph = createConsultationGraph(cp);
    streamConfig = { configurable: { thread_id: `consultation-${consultationId}` } };
  } else {
    graph = createConsultationGraph();
  }

  // Prepend patient profile context for profile-aware consultations (PROF-02)
  const enrichedSymptoms = patientContext
    ? `${patientContext}\n\nCurrent symptoms: ${symptoms}`
    : symptoms;

  const initialState = {
    symptoms: enrichedSymptoms,
    additionalInfo: [],
    messages: [],
    redFlags: [],
    relevantSpecialties: [],
    sessionId: sessionId || crypto.randomUUID(),
    startedAt: new Date(),
    currentStep: "triage",
  };

  // Use streamEvents (v2) to get token-level deltas from on_llm_stream events
  // and full node output from on_chain_end events
  for await (const event of graph.streamEvents(initialState, { version: 'v2', ...streamConfig })) {
    if (event.event === 'on_llm_stream') {
      // Token-level delta from whichever agent node is currently running
      const chunk = event.data?.chunk;
      const tokenText = typeof chunk?.content === 'string' ? chunk.content : '';
      if (tokenText) {
        const nodeName = event.metadata?.langgraph_node as string | undefined;
        const agent = nodeName ? agentRegistry[nodeName as AgentRole] : undefined;
        yield {
          step: nodeName || 'unknown',
          data: {},
          agentName: agent?.name,
          agentRole: agent?.role,
          specialty: agent?.specialties?.[0],
          eventType: 'token_delta',
          delta: tokenText,
        };
      }
    } else if (event.event === 'on_chain_end' && event.metadata?.langgraph_node) {
      // Full node output — emit as node_output with complete data and agent identity
      const nodeName = event.metadata.langgraph_node as string;
      // Skip internal LangGraph wrapper nodes
      if (['__start__', '__end__', 'LangGraph'].includes(nodeName)) continue;

      const agent = agentRegistry[nodeName as AgentRole];
      const nodeOutput = event.data?.output;

      // Only yield node_output if there's meaningful output data
      if (nodeOutput && typeof nodeOutput === 'object' && Object.keys(nodeOutput).length > 0) {
        yield {
          step: nodeName,
          data: nodeOutput as Partial<ConsultationState>,
          agentName: agent?.name,
          agentRole: agent?.role,
          specialty: agent?.specialties?.[0],
          eventType: 'node_output',
        };
      }

      // After triage, emit routing event with relevant specialists (CONS-03)
      if (nodeName === 'triage') {
        const triageData = nodeOutput as Partial<ConsultationState>;
        if (triageData?.relevantSpecialties && triageData.relevantSpecialties.length > 0) {
          yield {
            step: 'routing',
            data: { relevantSpecialties: triageData.relevantSpecialties },
            eventType: 'routing',
            agentName: 'MediCrew AI — Coordinator',
            agentRole: 'orchestrator',
            specialty: 'Routing',
          };
        }
      }
    }
  }
}
