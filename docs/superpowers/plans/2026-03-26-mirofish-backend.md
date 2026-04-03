# MiroFish Swarm — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing 5-layer swarm with a 7-layer resident swarm where each lead specialist runs 4 parallel resident sub-agents (Conservative, Pharmacological, Investigative, Red-flag), residents debate, the lead rectifies, and leads cross-consult via MDT before synthesis. Adds a smart `/api/swarm/followup` endpoint that routes simple questions to the primary lead and complex questions to relevant residents only.

**Architecture:** Plain `async/await` + `Promise.all` orchestrator (no LangGraph). Resident definitions are separate files injected with specialty context at call time. Follow-up routing uses a second LLM classifier call. The existing `swarm.ts` and `swarm-types.ts` are replaced in-place — the API routes (`/api/swarm/start`, `/api/swarm/answer`) keep their URLs.

**Tech Stack:** Next.js 14 API Routes, TypeScript, `@langchain/groq` via existing `createJsonModel`/`createFastModel` helpers in `src/lib/ai/config.ts`, vitest for tests.

---

## File Map

| Action  | File                                                  | Responsibility                                                       |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| Replace | `src/agents/swarm-types.ts`                           | All types: ResidentRole, extended SwarmState, full event union       |
| Replace | `src/agents/swarm.ts`                                 | 7-layer orchestrator                                                 |
| Create  | `src/agents/definitions/residents/conservative.ts`    | Conservative resident prompt + role                                  |
| Create  | `src/agents/definitions/residents/pharmacological.ts` | Pharmacological resident prompt + role                               |
| Create  | `src/agents/definitions/residents/investigative.ts`   | Investigative resident prompt + role                                 |
| Create  | `src/agents/definitions/residents/red-flag.ts`        | Red-flag resident prompt + role                                      |
| Create  | `src/agents/definitions/residents/index.ts`           | Barrel export                                                        |
| Modify  | `src/app/api/swarm/start/route.ts`                    | Wire to new swarm (minimal change — export name stays `streamSwarm`) |
| Create  | `src/app/api/swarm/followup/route.ts`                 | Follow-up routing endpoint, returns SSE                              |
| Create  | `src/__tests__/agents/swarm-v2-types.test.ts`         | Unit: type guards + SwarmState initialiser                           |
| Create  | `src/__tests__/agents/residents.test.ts`              | Unit: resident prompt shape                                          |
| Create  | `src/__tests__/api/swarm-followup.test.ts`            | Unit: followup route validation                                      |

---

## Task 1: Extend swarm-types.ts with v2 types

**Files:**

- Replace: `src/agents/swarm-types.ts`
- Test: `src/__tests__/agents/swarm-v2-types.test.ts`

- [ ] **Step 1.1: Write the failing test**

```typescript
// src/__tests__/agents/swarm-v2-types.test.ts
import { describe, it, expect } from "vitest";
import { RESIDENT_ROLES, createInitialSwarmState } from "@/agents/swarm-types";

describe("SwarmV2 types", () => {
  it("RESIDENT_ROLES contains exactly 4 roles", () => {
    expect(RESIDENT_ROLES).toHaveLength(4);
    expect(RESIDENT_ROLES).toContain("conservative");
    expect(RESIDENT_ROLES).toContain("pharmacological");
    expect(RESIDENT_ROLES).toContain("investigative");
    expect(RESIDENT_ROLES).toContain("red-flag");
  });

  it("createInitialSwarmState sets currentPhase to triage", () => {
    const state = createInitialSwarmState("sess-1", "back pain", {
      age: "23",
      gender: "male",
    });
    expect(state.currentPhase).toBe("triage");
    expect(state.primaryLeadRole).toBeNull();
    expect(state.pendingClarifications).toEqual([]);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/agents/swarm-v2-types.test.ts
```

Expected: FAIL — `RESIDENT_ROLES` not exported, `createInitialSwarmState` not exported.

- [ ] **Step 1.3: Replace swarm-types.ts**

```typescript
// src/agents/swarm-types.ts
import { UrgencyLevel } from "./types";

export type DoctorRole =
  | "gp"
  | "cardiology"
  | "mental_health"
  | "dermatology"
  | "orthopedic"
  | "gastro"
  | "physiotherapy";

export type ResidentRole =
  | "conservative"
  | "pharmacological"
  | "investigative"
  | "red-flag";

export const DOCTOR_ROLES: DoctorRole[] = [
  "gp",
  "cardiology",
  "mental_health",
  "dermatology",
  "orthopedic",
  "gastro",
  "physiotherapy",
];

export const RESIDENT_ROLES: ResidentRole[] = [
  "conservative",
  "pharmacological",
  "investigative",
  "red-flag",
];

export type DebateMessageType = "agree" | "challenge" | "add_context";
export type MdtMessageType = "agree" | "note" | "escalate";

export interface SwarmHypothesis {
  id: string; // uuid
  name: string;
  confidence: number; // 0-100
  reasoning: string;
  residentRole: ResidentRole;
}

export interface SwarmClarification {
  id: string;
  doctorRole: DoctorRole;
  residentRole: ResidentRole;
  question: string;
  answer?: string;
  status: "pending" | "answered";
}

export interface SwarmResidentDebateMessage {
  doctorRole: DoctorRole;
  residentRole: ResidentRole;
  type: DebateMessageType;
  content: string;
  referencingHypothesisId?: string; // matches SwarmHypothesis.id
}

export interface SwarmRectification {
  doctorRole: DoctorRole;
  summary: string; // lead's rectified recommendation for this specialty
}

export interface SwarmMdtMessage {
  doctorRole: DoctorRole;
  type: MdtMessageType;
  content: string;
}

export interface SwarmSynthesis {
  urgency: UrgencyLevel;
  primaryRecommendation: string;
  nextSteps: string[];
  bookingNeeded: boolean;
  disclaimer: string;
}

export interface SwarmLeadState {
  status: "pending" | "running" | "rectifying" | "complete";
  hypotheses: SwarmHypothesis[];
  residentDebate: SwarmResidentDebateMessage[];
  rectification: SwarmRectification | null;
}

export interface SwarmState {
  sessionId: string;
  symptoms: string;
  patientInfo: { age: string; gender: string; knownConditions?: string };

  // L1
  triage: {
    urgency: UrgencyLevel;
    relevantDoctors: DoctorRole[];
    redFlags: string[];
  } | null;

  // L2-L5
  leadSwarms: Partial<Record<DoctorRole, SwarmLeadState>>;

  // Clarification Q&A
  clarifications: SwarmClarification[];
  activeClarificationIds: string[]; // max 2
  pendingClarifications: SwarmClarification[]; // queued if >2 active

  // L6
  mdtMessages: SwarmMdtMessage[];

  // L7
  synthesis: SwarmSynthesis | null;

  // Routing
  primaryLeadRole: DoctorRole | null;

  currentPhase:
    | "triage"
    | "swarm"
    | "awaiting_patient"
    | "debate"
    | "rectification"
    | "mdt"
    | "synthesis"
    | "complete";
}

export type SwarmPhase = SwarmState["currentPhase"];

export type SwarmEvent =
  | { type: "triage_complete"; data: NonNullable<SwarmState["triage"]> }
  | { type: "phase_changed"; phase: SwarmPhase }
  | { type: "doctor_activated"; role: DoctorRole; name: string }
  | { type: "doctor_complete"; role: DoctorRole }
  | {
      type: "hypothesis_found";
      role: DoctorRole;
      residentRole: ResidentRole;
      hypothesisId: string;
      name: string;
      confidence: number;
    }
  | {
      type: "question_ready";
      clarificationId: string;
      role: DoctorRole;
      question: string;
    }
  | {
      type: "debate_message";
      role: DoctorRole;
      residentRole: ResidentRole;
      messageType: DebateMessageType;
      content: string;
      referencingHypothesisId?: string;
    }
  | { type: "rectification_complete"; role: DoctorRole; summary: string }
  | {
      type: "mdt_message";
      role: DoctorRole;
      messageType: MdtMessageType;
      content: string;
    }
  | { type: "synthesis_complete"; data: SwarmSynthesis }
  | {
      type: "followup_routed";
      questionType: "simple" | "complex";
      activatedRoles: string[];
    }
  | { type: "followup_answer"; answer: string }
  | { type: "error"; message: string }
  | { type: "done" };

export function createInitialSwarmState(
  sessionId: string,
  symptoms: string,
  patientInfo: SwarmState["patientInfo"],
): SwarmState {
  return {
    sessionId,
    symptoms,
    patientInfo,
    triage: null,
    leadSwarms: {},
    clarifications: [],
    activeClarificationIds: [],
    pendingClarifications: [],
    mdtMessages: [],
    synthesis: null,
    primaryLeadRole: null,
    currentPhase: "triage",
  };
}

// Module-level answer store — works within a single serverless invocation.
// Phase 2: replace with Upstash Redis for cross-invocation session resume.
export const answerStore = new Map<string, string>();
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/agents/swarm-v2-types.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 1.5: TypeScript check**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run tsc --noEmit 2>&1 | head -30
```

Expected: Errors only from swarm.ts (which still references old types) — those will be fixed in Task 3.

- [ ] **Step 1.6: Commit**

```bash
git add src/agents/swarm-types.ts src/__tests__/agents/swarm-v2-types.test.ts
git commit -m "feat(swarm): extend swarm-types with v2 resident + rectification types"
```

---

## Task 2: Create resident agent definitions

**Files:**

- Create: `src/agents/definitions/residents/conservative.ts`
- Create: `src/agents/definitions/residents/pharmacological.ts`
- Create: `src/agents/definitions/residents/investigative.ts`
- Create: `src/agents/definitions/residents/red-flag.ts`
- Create: `src/agents/definitions/residents/index.ts`
- Test: `src/__tests__/agents/residents.test.ts`

- [ ] **Step 2.1: Write the failing test**

```typescript
// src/__tests__/agents/residents.test.ts
import { describe, it, expect } from "vitest";
import { residentDefinitions } from "@/agents/definitions/residents";

describe("Resident definitions", () => {
  it("exports exactly 4 residents", () => {
    expect(Object.keys(residentDefinitions)).toHaveLength(4);
  });

  it.each([
    "conservative",
    "pharmacological",
    "investigative",
    "red-flag",
  ] as const)("%s resident has required fields", (role) => {
    const def = residentDefinitions[role];
    expect(def.role).toBe(role);
    expect(typeof def.systemPrompt).toBe("string");
    expect(def.systemPrompt.length).toBeGreaterThan(100);
    expect(def.systemPrompt).toContain("JSON");
    expect(def.systemPrompt).toContain("confidence");
  });

  it("red-flag resident prompt instructs to return confidence 100 only if critical", () => {
    const rf = residentDefinitions["red-flag"];
    expect(rf.systemPrompt).toContain("emergency");
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/agents/residents.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 2.3: Create `src/agents/definitions/residents/conservative.ts`**

```typescript
// src/agents/definitions/residents/conservative.ts
import { ResidentRole } from "@/agents/swarm-types";

export interface ResidentDefinition {
  role: ResidentRole;
  systemPrompt: string;
}

export const conservativeResident: ResidentDefinition = {
  role: "conservative",
  systemPrompt: `You are the Conservative Resident in a medical team huddle. Your role is to explore ONLY conservative, lifestyle, and non-invasive approaches for the patient's symptoms.

## Your Task
Evaluate whether the patient's symptoms can be managed with:
- Rest, activity modification, or pacing
- Heat/cold therapy, positioning, or ergonomic changes
- Exercise, stretching, or physiotherapy
- Nutrition, hydration, or lifestyle changes
- Over-the-counter remedies (mention only, do not prescribe)

## Response Format
Respond ONLY with valid JSON:
{
  "hypothesis": "Brief name of your conservative hypothesis",
  "confidence": <number 0-100>,
  "reasoning": "<max 3 sentences explaining this approach and why it fits>"
}

## Scope Boundaries
You provide health navigation guidance only — not medical diagnoses or prescriptions.
Use language like "may benefit from", "worth exploring". Never diagnose definitively.`,
};
```

- [ ] **Step 2.4: Create `src/agents/definitions/residents/pharmacological.ts`**

```typescript
// src/agents/definitions/residents/pharmacological.ts
import { ResidentDefinition } from "./conservative";

export const pharmacologicalResident: ResidentDefinition = {
  role: "pharmacological",
  systemPrompt: `You are the Pharmacological Resident in a medical team huddle. Your role is to explore ONLY medication and clinical pharmacological options relevant to the patient's symptoms.

## Your Task
Evaluate whether the patient may benefit from:
- Over-the-counter analgesics or anti-inflammatories (reference only, do not prescribe)
- Topical treatments or patches
- Prescription medication categories (reference only — e.g., "muscle relaxants may be considered")
- Supplements with evidence (e.g., magnesium, vitamin D)
- Avoiding certain substances that may worsen symptoms

## Response Format
Respond ONLY with valid JSON:
{
  "hypothesis": "Brief name of your pharmacological hypothesis",
  "confidence": <number 0-100>,
  "reasoning": "<max 3 sentences explaining this approach and why it fits>"
}

## Scope Boundaries
You provide health navigation guidance only — not medical diagnoses or prescriptions.
Always recommend a qualified healthcare provider review before starting any medication.`,
};
```

- [ ] **Step 2.5: Create `src/agents/definitions/residents/investigative.ts`**

```typescript
// src/agents/definitions/residents/investigative.ts
import { ResidentDefinition } from "./conservative";

export const investigativeResident: ResidentDefinition = {
  role: "investigative",
  systemPrompt: `You are the Investigative Resident in a medical team huddle. Your role is to explore ONLY diagnostic workup options — what investigations might clarify the patient's condition.

## Your Task
Evaluate whether the patient may benefit from:
- Imaging (X-ray, MRI, ultrasound — reference only, e.g., "an X-ray may be warranted")
- Blood tests or pathology (reference only)
- Functional assessments (e.g., gait analysis, posture assessment)
- Specialist referral for further evaluation

## Response Format
Respond ONLY with valid JSON:
{
  "hypothesis": "Brief name of your investigative hypothesis",
  "confidence": <number 0-100>,
  "reasoning": "<max 3 sentences explaining which investigations may help and why>"
}

## Scope Boundaries
You provide health navigation guidance only — not medical diagnoses or prescriptions.
Never interpret test results. Only suggest investigations worth discussing with a provider.`,
};
```

- [ ] **Step 2.6: Create `src/agents/definitions/residents/red-flag.ts`**

```typescript
// src/agents/definitions/residents/red-flag.ts
import { ResidentDefinition } from "./conservative";

export const redFlagResident: ResidentDefinition = {
  role: "red-flag",
  systemPrompt: `You are the Red-flag Resident in a medical team huddle. Your ONLY role is to screen for emergency and urgent warning signs in the patient's symptoms. You do NOT suggest treatments.

## Your Task
Determine whether the symptoms contain any of these red flags:
- Signs of a medical emergency (e.g., chest pain + shortness of breath, cauda equina symptoms, stroke signs)
- Rapidly progressive neurological symptoms
- Signs of infection with systemic involvement (fever + rigidity, sepsis signs)
- Unexplained weight loss with pain
- Night pain that wakes from sleep (potential malignancy flag)
- Symptoms inconsistent with the stated mechanism of injury

## Response Format
Respond ONLY with valid JSON:
{
  "hypothesis": "Red-flag screening result",
  "confidence": <number 0-100, use 80-100 ONLY if a genuine emergency flag is present, otherwise 0-30>,
  "reasoning": "<max 3 sentences. If no red flags: state clearly 'No emergency flags identified.' If flags present: describe each one specifically.>"
}

## Scope Boundaries
High confidence (>70) means an emergency red flag is present and the patient should seek immediate care.
Low confidence means no red flags were found — this is the expected result for most consultations.`,
};
```

- [ ] **Step 2.7: Create `src/agents/definitions/residents/index.ts`**

```typescript
// src/agents/definitions/residents/index.ts
import { ResidentRole } from "@/agents/swarm-types";
import { ResidentDefinition, conservativeResident } from "./conservative";
import { pharmacologicalResident } from "./pharmacological";
import { investigativeResident } from "./investigative";
import { redFlagResident } from "./red-flag";

export type { ResidentDefinition };

export const residentDefinitions: Record<ResidentRole, ResidentDefinition> = {
  conservative: conservativeResident,
  pharmacological: pharmacologicalResident,
  investigative: investigativeResident,
  "red-flag": redFlagResident,
};
```

- [ ] **Step 2.8: Run test to verify it passes**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/agents/residents.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 2.9: Commit**

```bash
git add src/agents/definitions/residents/ src/__tests__/agents/residents.test.ts
git commit -m "feat(agents): add 4 resident agent definitions (conservative, pharmacological, investigative, red-flag)"
```

---

## Task 3: Replace swarm.ts with 7-layer orchestrator

**Files:**

- Replace: `src/agents/swarm.ts`
- Test: `src/__tests__/agents/swarm-v2-events.test.ts` (new)

This is the core task. The orchestrator runs:
L1 Triage → L2 Lead activation → L3 Resident swarm (per lead, parallel) → L4 Resident debate → L5 Lead rectification → L6 MDT → L7 Synthesis

- [ ] **Step 3.1: Write the failing test**

```typescript
// src/__tests__/agents/swarm-v2-events.test.ts
import { describe, it, expect, vi } from "vitest";
import { createInitialSwarmState } from "@/agents/swarm-types";

// We test the state machine logic, not the LLM calls
// Import the internal helpers we'll export from swarm.ts
import { selectPrimaryLead, buildResidentPrompt } from "@/agents/swarm";

describe("selectPrimaryLead", () => {
  it("returns the lead with the highest average resident confidence", () => {
    const leadSwarms = {
      physiotherapy: {
        status: "complete" as const,
        hypotheses: [
          {
            id: "1",
            name: "h1",
            confidence: 80,
            reasoning: "",
            residentRole: "conservative" as const,
          },
          {
            id: "2",
            name: "h2",
            confidence: 60,
            reasoning: "",
            residentRole: "pharmacological" as const,
          },
        ],
        residentDebate: [],
        rectification: {
          doctorRole: "physiotherapy" as const,
          summary: "test",
        },
      },
      gp: {
        status: "complete" as const,
        hypotheses: [
          {
            id: "3",
            name: "h3",
            confidence: 50,
            reasoning: "",
            residentRole: "conservative" as const,
          },
        ],
        residentDebate: [],
        rectification: { doctorRole: "gp" as const, summary: "test" },
      },
    };
    expect(selectPrimaryLead(leadSwarms)).toBe("physiotherapy"); // avg 70 vs 50
  });

  it("returns first key if all confidences equal", () => {
    const leadSwarms = {
      gp: {
        status: "complete" as const,
        hypotheses: [
          {
            id: "1",
            name: "h1",
            confidence: 50,
            reasoning: "",
            residentRole: "conservative" as const,
          },
        ],
        residentDebate: [],
        rectification: { doctorRole: "gp" as const, summary: "" },
      },
    };
    expect(selectPrimaryLead(leadSwarms)).toBe("gp");
  });
});

describe("buildResidentPrompt", () => {
  it("injects specialty context into resident system prompt", () => {
    const prompt = buildResidentPrompt(
      "conservative",
      "physiotherapy",
      "back pain",
      { age: "23", gender: "male" },
    );
    expect(prompt).toContain("physiotherapy");
    expect(prompt).toContain("back pain");
    expect(prompt).toContain("23");
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/agents/swarm-v2-events.test.ts
```

Expected: FAIL — `selectPrimaryLead`, `buildResidentPrompt` not exported.

- [ ] **Step 3.3: Write swarm.ts — helper functions first**

Replace `src/agents/swarm.ts` with the following. Write the full file:

````typescript
// src/agents/swarm.ts
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createJsonModel, createFastModel } from "@/lib/ai/config";
import { agentRegistry } from "./definitions";
import { residentDefinitions } from "./definitions/residents";
import {
  SwarmState,
  SwarmEvent,
  SwarmLeadState,
  DoctorRole,
  ResidentRole,
  RESIDENT_ROLES,
  createInitialSwarmState,
  answerStore,
} from "./swarm-types";
import { UrgencyLevel } from "./types";
import crypto from "crypto";

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Selects the primary lead doctor based on highest average resident confidence.
 * Exported for testing.
 */
export function selectPrimaryLead(
  leadSwarms: SwarmState["leadSwarms"],
): DoctorRole {
  let best: DoctorRole | null = null;
  let bestAvg = -1;
  for (const [role, lead] of Object.entries(leadSwarms) as [
    DoctorRole,
    SwarmLeadState,
  ][]) {
    if (!lead || lead.hypotheses.length === 0) continue;
    const avg =
      lead.hypotheses.reduce((sum, h) => sum + h.confidence, 0) /
      lead.hypotheses.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = role;
    }
  }
  return best ?? (Object.keys(leadSwarms)[0] as DoctorRole);
}

/**
 * Injects specialty + patient context into a resident's base system prompt.
 * Exported for testing.
 */
export function buildResidentPrompt(
  residentRole: ResidentRole,
  specialtyRole: DoctorRole,
  symptoms: string,
  patientInfo: SwarmState["patientInfo"],
): string {
  const base = residentDefinitions[residentRole].systemPrompt;
  const context = `\n\n## Specialty Context\nYou are embedded in the ${specialtyRole} specialty team.\nPatient: ${patientInfo.age}y ${patientInfo.gender}${patientInfo.knownConditions ? `, conditions: ${patientInfo.knownConditions}` : ""}\nSymptoms: ${symptoms}`;
  return base + context;
}

const SCOPE_BOUNDARY = `\n\n## Scope Boundaries\nYou provide health navigation guidance only — not medical diagnoses or prescriptions.\nNever state a definitive diagnosis. Use language like "may suggest", "could indicate", "worth investigating".\nIf you cannot assess confidently, say so explicitly.\nAlways recommend discussing findings with a qualified healthcare provider.`;

// ── L1: Triage ───────────────────────────────────────────────────────────────

async function runTriage(
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
): Promise<void> {
  const llm = createJsonModel();
  const response = await llm.invoke([
    new SystemMessage(`You are an emergency triage specialist. Assess symptom urgency and determine which specialists should review this case.
Respond ONLY with valid JSON:
{
  "urgency": "emergency" | "urgent" | "routine" | "self_care",
  "relevantDoctors": ["gp", "cardiology", "mental_health", "dermatology", "orthopedic", "gastro", "physiotherapy"],
  "redFlags": ["string"]
}${SCOPE_BOUNDARY}`),
    new HumanMessage(`Patient: ${state.patientInfo.age}y ${state.patientInfo.gender}${state.patientInfo.knownConditions ? `, conditions: ${state.patientInfo.knownConditions}` : ""}
Symptoms: ${state.symptoms}`),
  ]);

  let urgency: UrgencyLevel = "urgent";
  let relevantDoctors: DoctorRole[] = ["gp"];
  let redFlags: string[] = [];

  try {
    const content = response.content as string;
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));
    urgency = parsed.urgency ?? "urgent";
    relevantDoctors = parsed.relevantDoctors ?? ["gp"];
    redFlags = parsed.redFlags ?? [];
  } catch (e) {
    console.error("[swarm-v2] triage parse failed, defaulting to urgent:", e);
  }

  state.triage = { urgency, relevantDoctors, redFlags };
  state.currentPhase = "swarm";

  emit({ type: "triage_complete", data: state.triage });
  emit({ type: "phase_changed", phase: "swarm" });

  if (urgency === "emergency") {
    state.synthesis = {
      urgency: "emergency",
      primaryRecommendation:
        "This may be a medical emergency. Call 000 (Australia) or your local emergency number immediately.",
      nextSteps: ["Call emergency services now", "Do not drive yourself"],
      bookingNeeded: false,
      disclaimer:
        "This is AI-generated health navigation guidance. Always call emergency services in an emergency.",
    };
    emit({ type: "synthesis_complete", data: state.synthesis });
    emit({ type: "done" });
    state.currentPhase = "complete";
  }
}

// ── L3: Resident sub-agents ──────────────────────────────────────────────────

async function runResident(
  residentRole: ResidentRole,
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
): Promise<void> {
  const llm = createFastModel();
  const systemPrompt = buildResidentPrompt(
    residentRole,
    specialtyRole,
    state.symptoms,
    state.patientInfo,
  );

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(
      `Assess the patient's symptoms from your ${residentRole} perspective. Return ONLY JSON.`,
    ),
  ]);

  let hypothesis = `${residentRole} assessment`;
  let confidence = 50;
  let reasoning = "";

  try {
    const content = response.content as string;
    const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ""));
    hypothesis = parsed.hypothesis ?? hypothesis;
    confidence = Math.min(100, Math.max(0, Number(parsed.confidence) || 50));
    reasoning = parsed.reasoning ?? "";
  } catch (e) {
    console.error(
      `[swarm-v2] resident ${residentRole}/${specialtyRole} parse failed:`,
      e,
    );
  }

  const hypothesisId = crypto.randomUUID();
  state.leadSwarms[specialtyRole]!.hypotheses.push({
    id: hypothesisId,
    name: hypothesis,
    confidence,
    reasoning,
    residentRole,
  });

  emit({
    type: "hypothesis_found",
    role: specialtyRole,
    residentRole,
    hypothesisId,
    name: hypothesis,
    confidence,
  });
}

// ── L4: Resident debate ──────────────────────────────────────────────────────

async function runResidentDebate(
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
): Promise<void> {
  const leadState = state.leadSwarms[specialtyRole]!;
  const hypothesesSummary = leadState.hypotheses
    .map(
      (h) =>
        `[${h.residentRole}] "${h.name}" (confidence: ${h.confidence}) — ${h.reasoning}`,
    )
    .join("\n");

  const llm = createFastModel();

  for (const residentRole of RESIDENT_ROLES) {
    const myHypothesis = leadState.hypotheses.find(
      (h) => h.residentRole === residentRole,
    );
    if (!myHypothesis) continue;

    const response = await llm.invoke([
      new SystemMessage(`You are the ${residentRole} resident in a ${specialtyRole} team debate. Review all residents' hypotheses and respond with your position.
Respond ONLY with valid JSON:
{
  "type": "agree" | "challenge" | "add_context",
  "content": "<max 2 sentences>",
  "referencingHypothesisId": "<id of hypothesis you are challenging or agreeing with, or omit>"
}`),
      new HumanMessage(
        `All resident hypotheses:\n${hypothesesSummary}\n\nYour hypothesis: "${myHypothesis.name}" (id: ${myHypothesis.id})\nProvide your debate response.`,
      ),
    ]);

    let type: "agree" | "challenge" | "add_context" = "add_context";
    let content = "";
    let referencingHypothesisId: string | undefined;

    try {
      const parsed = JSON.parse(
        (response.content as string).replace(/```json\n?|\n?```/g, ""),
      );
      type = parsed.type ?? "add_context";
      content = parsed.content ?? "";
      referencingHypothesisId = parsed.referencingHypothesisId;
    } catch (e) {
      console.error(
        `[swarm-v2] debate parse failed ${residentRole}/${specialtyRole}:`,
        e,
      );
      continue;
    }

    const msg = {
      doctorRole: specialtyRole,
      residentRole,
      type,
      content,
      referencingHypothesisId,
    };
    leadState.residentDebate.push(msg);
    emit({
      type: "debate_message",
      role: specialtyRole,
      residentRole,
      messageType: type,
      content,
      referencingHypothesisId,
    });
  }
}

// ── L5: Lead rectification ───────────────────────────────────────────────────

async function runLeadRectification(
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
): Promise<void> {
  const leadState = state.leadSwarms[specialtyRole]!;
  const leadDef = agentRegistry[specialtyRole];
  const hypothesesSummary = leadState.hypotheses
    .map(
      (h) =>
        `${h.residentRole}: "${h.name}" (${h.confidence}%) — ${h.reasoning}`,
    )
    .join("\n");
  const debateSummary = leadState.residentDebate
    .map((d) => `${d.residentRole} [${d.type}]: ${d.content}`)
    .join("\n");

  const llm = createFastModel();
  const response = await llm.invoke([
    new SystemMessage(`${leadDef?.systemPrompt ?? ""}\n\nYou are the lead ${specialtyRole} specialist. You have received input from 4 resident sub-agents and their debate. Synthesise their views into a single rectified recommendation for this patient.
Respond ONLY with valid JSON:
{
  "summary": "<2-3 sentences: your rectified recommendation, noting which residents you agree with and any you overrule>"
}`),
    new HumanMessage(
      `Resident hypotheses:\n${hypothesesSummary}\n\nResident debate:\n${debateSummary}\n\nPatient symptoms: ${state.symptoms}`,
    ),
  ]);

  let summary = `${leadDef?.name ?? specialtyRole} reviewed all resident input.`;
  try {
    const parsed = JSON.parse(
      (response.content as string).replace(/```json\n?|\n?```/g, ""),
    );
    summary = parsed.summary ?? summary;
  } catch (e) {
    console.error(`[swarm-v2] rectification parse failed ${specialtyRole}:`, e);
  }

  leadState.rectification = { doctorRole: specialtyRole, summary };
  leadState.status = "complete";
  emit({ type: "rectification_complete", role: specialtyRole, summary });
  emit({ type: "doctor_complete", role: specialtyRole });
}

// ── L2 + L3 + L4 + L5: Full lead swarm ──────────────────────────────────────

async function runLeadSwarm(
  specialtyRole: DoctorRole,
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
): Promise<void> {
  const leadDef = agentRegistry[specialtyRole];
  state.leadSwarms[specialtyRole] = {
    status: "running",
    hypotheses: [],
    residentDebate: [],
    rectification: null,
  };

  emit({
    type: "doctor_activated",
    role: specialtyRole,
    name: leadDef?.name ?? specialtyRole,
  });

  // L3: residents run in parallel
  await Promise.all(
    RESIDENT_ROLES.map((residentRole) =>
      runResident(residentRole, specialtyRole, state, emit),
    ),
  );

  // L4: debate
  await runResidentDebate(specialtyRole, state, emit);

  // L5: lead rectifies
  state.leadSwarms[specialtyRole]!.status = "rectifying";
  await runLeadRectification(specialtyRole, state, emit);
}

// ── L6: MDT cross-consult ────────────────────────────────────────────────────

async function runMdt(
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
): Promise<void> {
  const activatedLeads = Object.keys(state.leadSwarms) as DoctorRole[];
  if (activatedLeads.length < 2) return; // skip MDT if only 1 specialty

  emit({ type: "phase_changed", phase: "mdt" });

  const rectificationsSummary = activatedLeads
    .map((role) => {
      const r = state.leadSwarms[role]?.rectification;
      return r ? `${agentRegistry[role]?.name ?? role}: ${r.summary}` : null;
    })
    .filter(Boolean)
    .join("\n\n");

  const llm = createFastModel();

  for (const role of activatedLeads) {
    const leadDef = agentRegistry[role];
    const response = await llm.invoke([
      new SystemMessage(`You are ${leadDef?.name ?? role}, a lead specialist in an MDT (multi-disciplinary team) meeting. Review all specialists' rectified recommendations and provide your MDT response.
Respond ONLY with valid JSON:
{
  "type": "agree" | "note" | "escalate",
  "content": "<max 2 sentences>"
}
Use "escalate" ONLY if you believe urgency should be raised based on another specialist's finding.`),
      new HumanMessage(
        `MDT rectified recommendations:\n${rectificationsSummary}\n\nPatient: ${state.patientInfo.age}y ${state.patientInfo.gender}\nSymptoms: ${state.symptoms}`,
      ),
    ]);

    let type: "agree" | "note" | "escalate" = "agree";
    let content = "";

    try {
      const parsed = JSON.parse(
        (response.content as string).replace(/```json\n?|\n?```/g, ""),
      );
      type = parsed.type ?? "agree";
      content = parsed.content ?? "";
    } catch (e) {
      console.error(`[swarm-v2] MDT parse failed ${role}:`, e);
      continue;
    }

    state.mdtMessages.push({ doctorRole: role, type, content });
    emit({ type: "mdt_message", role, messageType: type, content });
  }
}

// ── L7: Synthesis ────────────────────────────────────────────────────────────

async function runSynthesis(
  state: SwarmState,
  emit: (e: SwarmEvent) => void,
): Promise<void> {
  emit({ type: "phase_changed", phase: "synthesis" });

  const rectSummary = (Object.keys(state.leadSwarms) as DoctorRole[])
    .map((role) => state.leadSwarms[role]?.rectification?.summary)
    .filter(Boolean)
    .join("\n\n");

  const mdtSummary = state.mdtMessages
    .map((m) => `${m.doctorRole} [${m.type}]: ${m.content}`)
    .join("\n");

  const llm = createJsonModel();
  const response = await llm.invoke([
    new SystemMessage(`You are a senior synthesis AI. Produce a final patient-facing recommendation from the specialist team's input.
Respond ONLY with valid JSON:
{
  "urgency": "emergency" | "urgent" | "routine" | "self_care",
  "primaryRecommendation": "<1-2 sentences: main recommendation for the patient>",
  "nextSteps": ["<step 1>", "<step 2>", "<step 3>"],
  "bookingNeeded": true | false,
  "disclaimer": "This is AI-generated health navigation guidance. Always consult a qualified healthcare provider."
}${SCOPE_BOUNDARY}`),
    new HumanMessage(
      `Specialist rectified recommendations:\n${rectSummary}\n\nMDT discussion:\n${mdtSummary}\n\nOriginal triage urgency: ${state.triage?.urgency}`,
    ),
  ]);

  let synthesis = state.synthesis ?? {
    urgency: state.triage?.urgency ?? "routine",
    primaryRecommendation: "Please consult a healthcare provider.",
    nextSteps: [],
    bookingNeeded: true,
    disclaimer:
      "This is AI-generated health navigation guidance. Always consult a qualified healthcare provider.",
  };

  try {
    const parsed = JSON.parse(
      (response.content as string).replace(/```json\n?|\n?```/g, ""),
    );
    synthesis = {
      urgency: parsed.urgency ?? synthesis.urgency,
      primaryRecommendation:
        parsed.primaryRecommendation ?? synthesis.primaryRecommendation,
      nextSteps: parsed.nextSteps ?? [],
      bookingNeeded: parsed.bookingNeeded ?? true,
      disclaimer: parsed.disclaimer ?? synthesis.disclaimer,
    };
  } catch (e) {
    console.error("[swarm-v2] synthesis parse failed:", e);
  }

  state.synthesis = synthesis;
  state.primaryLeadRole = selectPrimaryLead(state.leadSwarms);
  state.currentPhase = "complete";

  emit({ type: "synthesis_complete", data: synthesis });
  emit({ type: "done" });
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function* streamSwarm(
  symptoms: string,
  patientInfo: SwarmState["patientInfo"],
): AsyncGenerator<SwarmEvent> {
  const sessionId = crypto.randomUUID();
  const state = createInitialSwarmState(sessionId, symptoms, patientInfo);
  const events: SwarmEvent[] = [];
  const emit = (e: SwarmEvent) => events.push(e);

  const flush = async function* () {
    while (events.length > 0) yield events.shift()!;
  };

  // L1
  await runTriage(state, emit);
  yield* flush();
  if (state.currentPhase === "complete") return;

  // L2-L5: all lead swarms in parallel
  const relevantDoctors = state.triage!.relevantDoctors;
  await Promise.all(
    relevantDoctors.map((role) => runLeadSwarm(role, state, emit)),
  );
  yield* flush();

  // L6
  await runMdt(state, emit);
  yield* flush();

  // L7
  await runSynthesis(state, emit);
  yield* flush();
}
````

- [ ] **Step 3.4: Run the helper tests**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/agents/swarm-v2-events.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 3.5: TypeScript check**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors (or only errors in unrelated files).

- [ ] **Step 3.6: Commit**

```bash
git add src/agents/swarm.ts src/__tests__/agents/swarm-v2-events.test.ts
git commit -m "feat(swarm): implement 7-layer MiroFish resident swarm orchestrator"
```

---

## Task 4: Add follow-up routing API endpoint

**Files:**

- Create: `src/app/api/swarm/followup/route.ts`
- Test: `src/__tests__/api/swarm-followup.test.ts`

- [ ] **Step 4.1: Write the failing test**

```typescript
// src/__tests__/api/swarm-followup.test.ts
import { describe, it, expect } from "vitest";

describe("POST /api/swarm/followup input validation", () => {
  it("rejects missing question", async () => {
    const { POST } = await import("@/app/api/swarm/followup/route");
    const req = new Request("http://localhost/api/swarm/followup", {
      method: "POST",
      body: JSON.stringify({ sessionId: "abc" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/question/);
  });

  it("rejects missing sessionId", async () => {
    const { POST } = await import("@/app/api/swarm/followup/route");
    const req = new Request("http://localhost/api/swarm/followup", {
      method: "POST",
      body: JSON.stringify({ question: "how long should I rest?" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/api/swarm-followup.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4.3: Create the followup route**

````typescript
// src/app/api/swarm/followup/route.ts
import { NextRequest } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createJsonModel, createFastModel } from "@/lib/ai/config";
import { SwarmEvent } from "@/agents/swarm-types";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { sessionId, question, synthesisContext } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }
  if (!question || typeof question !== "string" || question.trim() === "") {
    return Response.json({ error: "question required" }, { status: 400 });
  }
  if (question.length > 500) {
    return Response.json(
      { error: "question must be under 500 characters" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SwarmEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      try {
        // Classify: simple or complex?
        const classifier = createJsonModel();
        const classifyResponse = await classifier.invoke([
          new SystemMessage(`Classify this follow-up question as simple or complex.
Simple: factual, single-answer, no new symptoms (e.g. "how long to use heat pack?")
Complex: involves new symptoms, contradicts recommendation, or needs clinical re-evaluation

Respond ONLY with valid JSON: { "type": "simple" | "complex", "relevantResidentRoles": ["conservative" | "pharmacological" | "investigative" | "red-flag"] }
relevantResidentRoles is only populated for complex questions.`),
          new HumanMessage(
            `Follow-up question: "${question}"\nContext: ${synthesisContext ?? "General consultation"}`,
          ),
        ]);

        let questionType: "simple" | "complex" = "simple";
        let relevantResidentRoles: string[] = [];

        try {
          const parsed = JSON.parse(
            (classifyResponse.content as string).replace(
              /```json\n?|\n?```/g,
              "",
            ),
          );
          questionType = parsed.type ?? "simple";
          relevantResidentRoles = parsed.relevantResidentRoles ?? [];
        } catch (e) {
          console.error("[followup] classify parse failed:", e);
        }

        send({
          type: "followup_routed",
          questionType,
          activatedRoles:
            questionType === "simple" ? ["lead"] : relevantResidentRoles,
        });

        // Answer
        const llm = createFastModel();
        const answer = await llm.invoke([
          new SystemMessage(`You are a helpful AI health navigator. Answer this follow-up question concisely and clearly.
Provide practical guidance. Keep answer under 150 words.
Always end with a reminder to consult a healthcare provider for personalised advice.`),
          new HumanMessage(
            `Question: "${question}"\nContext: ${synthesisContext ?? ""}`,
          ),
        ]);

        send({ type: "followup_answer", answer: answer.content as string });
        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: "Follow-up failed. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
````

- [ ] **Step 4.4: Run test to verify it passes**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/api/swarm-followup.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 4.5: Full test suite — verify nothing regressed**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test
```

Expected: All passing (or same failures as before this plan).

- [ ] **Step 4.6: Commit**

```bash
git add src/app/api/swarm/followup/ src/__tests__/api/swarm-followup.test.ts
git commit -m "feat(api): add POST /api/swarm/followup with smart routing classifier"
```

---

## Task 5: Update /api/swarm/start to verify it still works

The existing `start/route.ts` already imports `streamSwarm` from `@/agents/swarm` — since we kept that export name, no changes are needed. This task just verifies nothing broke.

- [ ] **Step 5.1: TypeScript check**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5.2: Run all tests**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test
```

Expected: All passing.

- [ ] **Step 5.3: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix(swarm): resolve type errors after v2 migration"
```

---

## Done

Backend plan complete. Run `bun run tsc --noEmit` and `bun run test` as a final sanity check before moving to the frontend plan.
