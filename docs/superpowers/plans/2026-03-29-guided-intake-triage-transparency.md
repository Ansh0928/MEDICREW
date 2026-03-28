# Guided Intake + Triage Transparency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text symptom box with an adaptive AI-driven question sequence (body map, pain slider, duration chips, emotional check), show an "anything to add?" confirmation step, then make the live triage agent discussion visible to patients — using a shared `TriageTransparencyPanel` consumed by both `SwarmChat` and `HuddleRoom`.

**Architecture:** A stateless `/api/consult/intake` endpoint receives `answers[]` and returns the next question (with `type` and optional `options`); on LLM failure it falls back to a hardcoded static question list so the consultation is never blocked. `SwarmChat` gains two new steps (`"intake"` and `"confirm"`) between the existing `"info"` and `"chat"` steps. Intake answers are assembled into `symptoms` (natural language) and `patientInfo.historySummary` (structured) before the existing swarm call. A new `TriageTransparencyPanel` component wraps `DoctorOrbRow` + `LiveFeedLine` and is used in both `SwarmChat` and `HuddleRoom`.

**Tech Stack:** Next.js 14 App Router, React 19, TypeScript, Tailwind, Framer Motion, LangChain/Groq (`createFastModel()`), Zod, Vitest + Testing Library

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/intake-types.ts` | Shared `IntakeAnswer`, `IntakeQuestion` types |
| Create | `src/app/api/consult/intake/route.ts` | Stateless AI intake question endpoint |
| Create | `src/components/consult/BodyMap.tsx` | SVG front/back body diagram |
| Create | `src/components/consult/IntakeConversation.tsx` | Adaptive Q&A orchestrator |
| Create | `src/components/consult/TriageTransparencyPanel.tsx` | Shared orbs + live feed panel |
| Create | `src/__tests__/api/consult-intake.test.ts` | API unit tests |
| Create | `src/__tests__/components/intake-conversation.test.tsx` | Component tests (jsdom) |
| Create | `src/__tests__/components/triage-transparency-panel.test.tsx` | Panel component tests (jsdom) |
| Modify | `src/lib/consultation-intake.ts` | Extend `buildPatientContext()` for historySummary intake fields |
| Modify | `src/components/consult/SwarmChat.tsx` | Add `"intake"` + `"confirm"` steps; use `TriageTransparencyPanel` |
| Modify | `src/components/consult/HuddleRoom.tsx` | Add `TriageTransparencyPanel` as team overview panel |

---

## Task 1: Shared Types — `src/lib/intake-types.ts`

**Files:**
- Create: `src/lib/intake-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/lib/intake-types.ts

export interface IntakeAnswer {
  questionId: string;
  question: string;
  answer: string; // always a string — body region label, "7", "Today", "Anxious", free text
}

export type IntakeQuestionType =
  | "text"
  | "body-map"
  | "slider"
  | "chips"
  | "emotional"
  | "confirm";

export interface IntakeQuestion {
  questionId: string;
  question: string;
  type: IntakeQuestionType;
  options?: string[];  // for chips / emotional
  min?: number;        // for slider
  max?: number;        // for slider
  done: boolean;       // true = this is the last question (confirm step)
}

/** Builds a natural-language symptoms string from intake answers for the swarm. */
export function buildSymptomsFromAnswers(answers: IntakeAnswer[]): string {
  const parts = answers
    .filter((a) => a.answer.trim().length > 0 && a.questionId !== "confirm")
    .map((a) => `${a.question}: ${a.answer}`);
  const confirm = answers.find((a) => a.questionId === "confirm");
  const extra = confirm?.answer.trim();
  return [parts.join(". "), extra].filter(Boolean).join(". ");
}

/** Builds a historySummary string from structured intake answers (for buildPatientContext). */
export function buildHistorySummaryFromAnswers(answers: IntakeAnswer[]): string {
  const structured = ["location", "duration", "severity", "emotional"];
  const parts = answers
    .filter((a) => structured.includes(a.questionId) && a.answer.trim())
    .map((a) => {
      if (a.questionId === "severity") return `Severity: ${a.answer}/10`;
      if (a.questionId === "emotional") return `Emotional state: ${a.answer.replace(/^.*?\s/, "")}`;
      return `${a.question}: ${a.answer}`;
    });
  return parts.join(". ");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/intake-types.ts
git commit -m "feat(intake): add IntakeAnswer/IntakeQuestion types and builder utils"
```

---

## Task 2: Intake API — `/api/consult/intake`

**Files:**
- Create: `src/app/api/consult/intake/route.ts`
- Create: `src/__tests__/api/consult-intake.test.ts`

### Step 2a: Write failing tests first

- [ ] **Step 1: Create the test file**

```typescript
// src/__tests__/api/consult-intake.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Auth mock ────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getAuthenticatedPatient: vi.fn().mockResolvedValue({
    patient: { id: "patient-1" },
    needsOnboarding: false,
    error: null,
  }),
}));

// ── LLM mock — default to valid response ────────────────────────────────────
const mockInvoke = vi.fn();
vi.mock("@/lib/ai/config", () => ({
  createFastModel: vi.fn(() => ({ invoke: mockInvoke })),
}));

// ── Emergency rules mock ─────────────────────────────────────────────────────
vi.mock("@/lib/emergency-rules", () => ({
  detectEmergency: vi.fn().mockReturnValue({ isEmergency: false }),
}));

import { POST } from "@/app/api/consult/intake/route";
import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/consult/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/consult/intake", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns first static question when no answers provided", async () => {
    // First call with empty answers → returns first question without LLM
    const res = await POST(makeRequest({ answers: [] }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      questionId: "location",
      type: "body-map",
      done: false,
    });
  });

  it("returns AI-generated question when answers exist and LLM succeeds", async () => {
    mockInvoke.mockResolvedValueOnce({
      content: JSON.stringify({
        questionId: "radiation",
        question: "Does the chest pain radiate to your arm or jaw?",
        type: "chips",
        options: ["Yes, arm", "Yes, jaw", "Both", "Neither"],
        done: false,
      }),
    });

    const res = await POST(makeRequest({
      answers: [{ questionId: "location", question: "Where is your main symptom?", answer: "Chest" }],
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.question).toBe("Does the chest pain radiate to your arm or jaw?");
    expect(data.type).toBe("chips");
  });

  it("falls back to static questions when LLM times out", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("timeout"));

    const res = await POST(makeRequest({
      answers: [{ questionId: "location", question: "Where?", answer: "Chest" }],
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    // Should still return a valid question (static fallback)
    expect(data).toHaveProperty("questionId");
    expect(data).toHaveProperty("type");
    expect(data).toHaveProperty("done");
  });

  it("falls back when LLM returns malformed JSON", async () => {
    mockInvoke.mockResolvedValueOnce({ content: "not valid json at all" });

    const res = await POST(makeRequest({
      answers: [{ questionId: "location", question: "Where?", answer: "Back" }],
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty("questionId");
  });

  it("caps at 10 answers and returns confirm question", async () => {
    const tenAnswers = Array.from({ length: 10 }, (_, i) => ({
      questionId: `q${i}`,
      question: `Question ${i}`,
      answer: `Answer ${i}`,
    }));

    const res = await POST(makeRequest({ answers: tenAnswers }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.done).toBe(true);
    expect(data.questionId).toBe("confirm");
  });

  it("returns 400 for invalid request body", async () => {
    const res = await POST(makeRequest({ wrong: "field" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const { getAuthenticatedPatient } = await import("@/lib/auth");
    vi.mocked(getAuthenticatedPatient).mockResolvedValueOnce({
      patient: null,
      needsOnboarding: false,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const res = await POST(makeRequest({ answers: [] }));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew
bun run test src/__tests__/api/consult-intake.test.ts
```

Expected: FAIL — module not found for `@/app/api/consult/intake/route`

### Step 2b: Implement the route

- [ ] **Step 3: Create the intake route**

```typescript
// src/app/api/consult/intake/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPatient } from "@/lib/auth";
import { createFastModel } from "@/lib/ai/config";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { IntakeAnswer, IntakeQuestion } from "@/lib/intake-types";

const MAX_ANSWERS = 10;

// ── Static fallback questions ─────────────────────────────────────────────────
// Used when LLM fails. Order matters — these mirror the ideal adaptive flow.
const STATIC_QUESTIONS: IntakeQuestion[] = [
  {
    questionId: "location",
    question: "Where is your main symptom?",
    type: "body-map",
    done: false,
  },
  {
    questionId: "duration",
    question: "How long has this been going on?",
    type: "chips",
    options: ["Today", "A few days", "1–2 weeks", "Months"],
    done: false,
  },
  {
    questionId: "severity",
    question: "How severe is it?",
    type: "slider",
    min: 1,
    max: 10,
    done: false,
  },
  {
    questionId: "associated",
    question: "Any other symptoms alongside this?",
    type: "text",
    done: false,
  },
  {
    questionId: "emotional",
    question: "How are you feeling about this?",
    type: "emotional",
    options: ["😟 Anxious", "😔 Worried", "😐 Unsure", "😌 Calm"],
    done: false,
  },
  {
    questionId: "confirm",
    question: "Anything else you'd like the care team to know?",
    type: "confirm",
    done: true,
  },
];

const CONFIRM_QUESTION: IntakeQuestion = STATIC_QUESTIONS[STATIC_QUESTIONS.length - 1];

// ── Input schema ──────────────────────────────────────────────────────────────
const IntakeAnswerSchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.string(),
});

const IntakeRequestSchema = z.object({
  answers: z.array(IntakeAnswerSchema).max(MAX_ANSWERS),
});

// ── Next static question ──────────────────────────────────────────────────────
function nextStaticQuestion(answers: IntakeAnswer[]): IntakeQuestion {
  const answeredIds = new Set(answers.map((a) => a.questionId));
  const next = STATIC_QUESTIONS.find((q) => !answeredIds.has(q.questionId));
  return next ?? CONFIRM_QUESTION;
}

// ── AI-driven next question ───────────────────────────────────────────────────
async function getAIQuestion(answers: IntakeAnswer[]): Promise<IntakeQuestion> {
  const llm = createFastModel();

  const answerSummary = answers
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const systemPrompt = `You are a medical intake assistant. Based on the patient's answers so far, determine the single most important follow-up question to ask next.

Rules:
- Ask exactly ONE question
- Choose the type that best suits the question: "text", "body-map", "slider", "chips", "emotional", or "confirm"
- For "chips" and "emotional" types, provide 2-4 options
- For "slider", provide min and max (usually 1 and 10)
- Set done=true only when you have enough information for a consultation (after at least 4 questions)
- Never ask about something already answered
- Keep questions short and empathetic
- The questionId should be a short snake_case identifier

Return ONLY valid JSON in this exact format:
{
  "questionId": "string",
  "question": "string",
  "type": "text" | "body-map" | "slider" | "chips" | "emotional" | "confirm",
  "options": ["string"] or omit,
  "min": number or omit,
  "max": number or omit,
  "done": boolean
}`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(`Patient's answers so far:\n\n${answerSummary}`),
  ]);

  const content = response.content as string;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in LLM response");

  const parsed = JSON.parse(jsonMatch[0]) as IntakeQuestion;

  // Validate required fields
  if (!parsed.questionId || !parsed.question || !parsed.type || typeof parsed.done !== "boolean") {
    throw new Error("LLM response missing required fields");
  }

  return parsed;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { patient, needsOnboarding, error: authError } = await getAuthenticatedPatient();
  if (authError) return authError;
  if (needsOnboarding) {
    return NextResponse.json({ error: "Onboarding required" }, { status: 403 });
  }
  // patient is used for auth verification — intake is stateless so we don't write to DB here
  void patient;

  const bodyResult = IntakeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: bodyResult.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { answers } = bodyResult.data;

  // Cap guard — force confirm after MAX_ANSWERS
  if (answers.length >= MAX_ANSWERS) {
    return NextResponse.json(CONFIRM_QUESTION);
  }

  // First question is always the static body-map (no LLM needed)
  if (answers.length === 0) {
    return NextResponse.json(STATIC_QUESTIONS[0]);
  }

  // Try AI-driven question; fall back to static on any failure
  try {
    const question = await getAIQuestion(answers);
    return NextResponse.json(question);
  } catch {
    console.warn("[intake] LLM fallback at step", answers.length);
    return NextResponse.json(nextStaticQuestion(answers));
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun run test src/__tests__/api/consult-intake.test.ts
```

Expected: 7 passing

- [ ] **Step 5: Commit**

```bash
git add src/lib/intake-types.ts src/app/api/consult/intake/route.ts src/__tests__/api/consult-intake.test.ts
git commit -m "feat(intake): /api/consult/intake — adaptive AI questions with static fallback"
```

---

## Task 3: BodyMap Component

**Files:**
- Create: `src/components/consult/BodyMap.tsx`
- Create: `src/__tests__/components/intake-conversation.test.tsx` (tests added later in Task 5)

- [ ] **Step 1: Create the BodyMap component**

```tsx
// src/components/consult/BodyMap.tsx
"use client";
import { useState } from "react";

export type BodyRegion =
  | "Head"
  | "Neck"
  | "Chest"
  | "Left arm"
  | "Right arm"
  | "Abdomen"
  | "Lower back"
  | "Left leg"
  | "Right leg"
  | "Full back";

interface Region {
  id: BodyRegion;
  label: string;
  // SVG rect bounds for front view; back view uses different set
  x: number;
  y: number;
  w: number;
  h: number;
  view: "front" | "back";
}

const REGIONS: Region[] = [
  { id: "Head",       label: "Head",       x: 38, y: 4,   w: 24, h: 20, view: "front" },
  { id: "Neck",       label: "Neck",       x: 45, y: 24,  w: 10, h: 10, view: "front" },
  { id: "Chest",      label: "Chest",      x: 28, y: 34,  w: 44, h: 28, view: "front" },
  { id: "Left arm",   label: "L. Arm",     x: 8,  y: 34,  w: 18, h: 40, view: "front" },
  { id: "Right arm",  label: "R. Arm",     x: 74, y: 34,  w: 18, h: 40, view: "front" },
  { id: "Abdomen",    label: "Abdomen",    x: 28, y: 62,  w: 44, h: 28, view: "front" },
  { id: "Left leg",   label: "L. Leg",     x: 28, y: 90,  w: 20, h: 48, view: "front" },
  { id: "Right leg",  label: "R. Leg",     x: 52, y: 90,  w: 20, h: 48, view: "front" },
  { id: "Lower back", label: "Lower back", x: 28, y: 62,  w: 44, h: 28, view: "back" },
  { id: "Full back",  label: "Upper back", x: 28, y: 34,  w: 44, h: 28, view: "back" },
];

interface BodyMapProps {
  selected: BodyRegion | null;
  onSelect: (region: BodyRegion) => void;
}

export function BodyMap({ selected, onSelect }: BodyMapProps) {
  const [view, setView] = useState<"front" | "back">("front");
  const visibleRegions = REGIONS.filter((r) => r.view === view);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Front / Back toggle */}
      <div className="flex gap-1 text-xs border rounded-full overflow-hidden">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1 capitalize transition-colors ${
              view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* SVG body diagram */}
      <svg
        viewBox="0 0 100 140"
        className="w-40 h-56"
        aria-label="Body diagram — tap to select location"
      >
        {visibleRegions.map((r) => {
          const isSelected = selected === r.id;
          return (
            <g key={r.id}>
              <rect
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                rx={4}
                className="cursor-pointer transition-all"
                fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={1}
                onClick={() => onSelect(r.id)}
                aria-label={r.label}
                role="button"
              />
              <text
                x={r.x + r.w / 2}
                y={r.y + r.h / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={5}
                fill={isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))"}
                className="pointer-events-none select-none"
              >
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>

      {selected && (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="text-foreground font-medium">{selected}</span>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/consult/BodyMap.tsx
git commit -m "feat(intake): BodyMap SVG component — front/back region tap selection"
```

---

## Task 4: IntakeConversation Component

**Files:**
- Create: `src/components/consult/IntakeConversation.tsx`
- Create: `src/__tests__/components/intake-conversation.test.tsx`

### Step 4a: Write failing tests

- [ ] **Step 1: Create the test file**

```tsx
// src/__tests__/components/intake-conversation.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntakeConversation } from "@/components/consult/IntakeConversation";
import type { IntakeQuestion } from "@/lib/intake-types";

// ── Fetch mock ────────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockIntakeResponse(question: IntakeQuestion) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => question,
  });
}

const bodyMapQuestion: IntakeQuestion = {
  questionId: "location",
  question: "Where is your main symptom?",
  type: "body-map",
  done: false,
};

const textQuestion: IntakeQuestion = {
  questionId: "associated",
  question: "Any other symptoms alongside this?",
  type: "text",
  done: false,
};

const chipsQuestion: IntakeQuestion = {
  questionId: "duration",
  question: "How long has this been going on?",
  type: "chips",
  options: ["Today", "A few days", "1–2 weeks", "Months"],
  done: false,
};

const sliderQuestion: IntakeQuestion = {
  questionId: "severity",
  question: "How severe is it?",
  type: "slider",
  min: 1,
  max: 10,
  done: false,
};

const confirmQuestion: IntakeQuestion = {
  questionId: "confirm",
  question: "Anything else you'd like the care team to know?",
  type: "confirm",
  done: true,
};

describe("IntakeConversation", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches first question on mount and renders body-map", async () => {
    mockIntakeResponse(bodyMapQuestion);
    render(<IntakeConversation onComplete={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Where is your main symptom?")).toBeInTheDocument();
      expect(screen.getByLabelText("Body diagram — tap to select location")).toBeInTheDocument();
    });
  });

  it("disables Next until body map region is selected", async () => {
    mockIntakeResponse(bodyMapQuestion);
    render(<IntakeConversation onComplete={vi.fn()} />);
    await waitFor(() => screen.getByText("Where is your main symptom?"));
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("enables Next after body map region selected", async () => {
    const user = userEvent.setup();
    mockIntakeResponse(bodyMapQuestion);
    render(<IntakeConversation onComplete={vi.fn()} />);
    await waitFor(() => screen.getByLabelText("Head"));
    await user.click(screen.getByLabelText("Head"));
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("renders chips question with all options", async () => {
    mockIntakeResponse(chipsQuestion);
    render(<IntakeConversation onComplete={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getByText("A few days")).toBeInTheDocument();
    });
  });

  it("advances to next question after answering chips", async () => {
    const user = userEvent.setup();
    mockIntakeResponse(chipsQuestion);
    mockIntakeResponse(sliderQuestion);
    render(<IntakeConversation onComplete={vi.fn()} />);
    await waitFor(() => screen.getByText("Today"));
    await user.click(screen.getByText("Today"));
    await waitFor(() => {
      expect(screen.getByText("How severe is it?")).toBeInTheDocument();
    });
  });

  it("calls onComplete with answers when confirm step submitted", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    mockIntakeResponse(confirmQuestion);
    render(<IntakeConversation onComplete={onComplete} />);
    await waitFor(() => screen.getByText("Anything else you'd like the care team to know?"));
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onComplete).toHaveBeenCalledWith(
      expect.any(Array),  // answers
      expect.any(String), // symptoms string
      expect.any(String), // historySummary string
    );
  });

  it("renders text question with input box", async () => {
    mockIntakeResponse(textQuestion);
    render(<IntakeConversation onComplete={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun run test src/__tests__/components/intake-conversation.test.tsx
```

Expected: FAIL — `IntakeConversation` not found

### Step 4b: Implement the component

- [ ] **Step 3: Create IntakeConversation**

```tsx
// src/components/consult/IntakeConversation.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { BodyMap, BodyRegion } from "./BodyMap";
import { IntakeAnswer, IntakeQuestion, buildSymptomsFromAnswers, buildHistorySummaryFromAnswers } from "@/lib/intake-types";

interface IntakeConversationProps {
  onComplete: (answers: IntakeAnswer[], symptoms: string, historySummary: string) => void;
}

export function IntakeConversation({ onComplete }: IntakeConversationProps) {
  const [answers, setAnswers] = useState<IntakeAnswer[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<IntakeQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNextQuestion = useCallback(async (answersToSend: IntakeAnswer[]) => {
    setIsLoading(true);
    setError(null);
    setCurrentAnswer("");

    try {
      const res = await fetch("/api/consult/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersToSend }),
      });
      if (!res.ok) throw new Error(`intake API error ${res.status}`);
      const question: IntakeQuestion = await res.json();
      setCurrentQuestion(question);
    } catch {
      setError("Connection issue — please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch first question on mount
  useEffect(() => { fetchNextQuestion([]); }, [fetchNextQuestion]);

  const handleNext = useCallback(() => {
    if (!currentQuestion || !currentAnswer.trim()) return;

    const newAnswer: IntakeAnswer = {
      questionId: currentQuestion.questionId,
      question: currentQuestion.question,
      answer: currentAnswer.trim(),
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (currentQuestion.done) {
      const symptoms = buildSymptomsFromAnswers(updatedAnswers);
      const historySummary = buildHistorySummaryFromAnswers(updatedAnswers);
      onComplete(updatedAnswers, symptoms, historySummary);
      return;
    }

    fetchNextQuestion(updatedAnswers);
  }, [currentQuestion, currentAnswer, answers, fetchNextQuestion, onComplete]);

  const handleBack = useCallback(() => {
    if (answers.length === 0) return;
    const previous = [...answers];
    previous.pop();
    setAnswers(previous);
    fetchNextQuestion(previous);
  }, [answers, fetchNextQuestion]);

  const isNextDisabled =
    isLoading || !currentAnswer.trim() || (currentQuestion?.type === "body-map" && !currentAnswer);

  if (isLoading && !currentQuestion) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-3 py-4">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => fetchNextQuestion(answers)}
          className="text-sm underline text-muted-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="space-y-5">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: Math.max(answers.length + 1, 1) }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i < answers.length ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <p className="text-sm font-medium text-center">{currentQuestion.question}</p>

      {/* Input by type */}
      {currentQuestion.type === "body-map" && (
        <BodyMap
          selected={currentAnswer as BodyRegion | null}
          onSelect={(region) => setCurrentAnswer(region)}
        />
      )}

      {currentQuestion.type === "slider" && (
        <div className="space-y-2">
          <input
            type="range"
            min={currentQuestion.min ?? 1}
            max={currentQuestion.max ?? 10}
            value={currentAnswer || String(Math.round(((currentQuestion.min ?? 1) + (currentQuestion.max ?? 10)) / 2))}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="w-full accent-primary"
            aria-label={currentQuestion.question}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentQuestion.min ?? 1} — mild</span>
            <span className="font-medium text-foreground text-sm">
              {currentAnswer || String(Math.round(((currentQuestion.min ?? 1) + (currentQuestion.max ?? 10)) / 2))}
            </span>
            <span>{currentQuestion.max ?? 10} — severe</span>
          </div>
          {/* Ensure a default answer is set when slider is first rendered */}
          {!currentAnswer && (() => {
            const defaultVal = String(Math.round(((currentQuestion.min ?? 1) + (currentQuestion.max ?? 10)) / 2));
            setCurrentAnswer(defaultVal);
            return null;
          })()}
        </div>
      )}

      {(currentQuestion.type === "chips" || currentQuestion.type === "emotional") && (
        <div className="flex flex-wrap gap-2 justify-center">
          {(currentQuestion.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => setCurrentAnswer(opt)}
              className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                currentAnswer === opt
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {currentQuestion.type === "text" && (
        <textarea
          placeholder="Describe in your own words..."
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background resize-none"
          aria-label={currentQuestion.question}
          autoFocus
        />
      )}

      {currentQuestion.type === "confirm" && (
        <textarea
          placeholder="Optional — leave blank to skip"
          value={currentAnswer}
          onChange={(e) => {
            if (e.target.value.length <= 2000) setCurrentAnswer(e.target.value);
          }}
          maxLength={2000}
          rows={3}
          className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background resize-none"
          aria-label={currentQuestion.question}
          autoFocus
        />
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        {answers.length > 0 && (
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            ← Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={
            isLoading ||
            (currentQuestion.type !== "confirm" && !currentAnswer.trim()) ||
            (currentQuestion.type === "body-map" && !currentAnswer)
          }
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading
            </span>
          ) : currentQuestion.done ? (
            "Submit →"
          ) : (
            "Next →"
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun run test src/__tests__/components/intake-conversation.test.tsx
```

Expected: 7 passing

- [ ] **Step 5: Commit**

```bash
git add src/components/consult/IntakeConversation.tsx src/__tests__/components/intake-conversation.test.tsx
git commit -m "feat(intake): IntakeConversation adaptive Q&A component"
```

---

## Task 5: TriageTransparencyPanel — Shared Component

**Files:**
- Create: `src/components/consult/TriageTransparencyPanel.tsx`
- Create: `src/__tests__/components/triage-transparency-panel.test.tsx`

### Step 5a: Write failing tests

- [ ] **Step 1: Create the test file**

```tsx
// src/__tests__/components/triage-transparency-panel.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TriageTransparencyPanel } from "@/components/consult/TriageTransparencyPanel";
import type { OrbState } from "@/components/consult/TriageTransparencyPanel";

describe("TriageTransparencyPanel", () => {
  it("renders nothing when isVisible is false", () => {
    const { container } = render(
      <TriageTransparencyPanel orbs={[]} liveFeed="" isVisible={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders orbs when visible", () => {
    const orbs: OrbState[] = [
      { role: "gp", status: "active" },
      { role: "cardiology", status: "waiting" },
    ];
    render(<TriageTransparencyPanel orbs={orbs} liveFeed="" isVisible={true} />);
    expect(screen.getByLabelText(/alex ai.*thinking/i)).toBeInTheDocument();
  });

  it("renders live feed text when provided", () => {
    render(
      <TriageTransparencyPanel
        orbs={[]}
        liveFeed="Jordan AI is reviewing your symptoms..."
        isVisible={true}
      />
    );
    expect(screen.getByText("Jordan AI is reviewing your symptoms...")).toBeInTheDocument();
  });

  it("renders 'Your care team' heading", () => {
    render(<TriageTransparencyPanel orbs={[{ role: "gp", status: "done" }]} liveFeed="" isVisible={true} />);
    expect(screen.getByText(/your care team/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
bun run test src/__tests__/components/triage-transparency-panel.test.tsx
```

Expected: FAIL — module not found

### Step 5b: Implement the component

- [ ] **Step 3: Create TriageTransparencyPanel**

```tsx
// src/components/consult/TriageTransparencyPanel.tsx
"use client";
import { DoctorOrbRow } from "./DoctorOrbRow";
import { LiveFeedLine } from "./LiveFeedLine";
import { DoctorRole } from "@/agents/swarm-types";

export type OrbStatus = "waiting" | "active" | "done";

export interface OrbState {
  role: DoctorRole;
  status: OrbStatus;
}

interface TriageTransparencyPanelProps {
  orbs: OrbState[];
  liveFeed: string;
  isVisible: boolean;
}

/**
 * Shared panel showing agent activations + live feed.
 * Used in SwarmChat (patient view) and HuddleRoom (doctor team overview).
 */
export function TriageTransparencyPanel({ orbs, liveFeed, isVisible }: TriageTransparencyPanelProps) {
  if (!isVisible) return null;

  return (
    <div className="border rounded-xl p-4 mb-4 space-y-3">
      <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">
        Your care team
      </p>
      <DoctorOrbRow orbs={orbs} />
      <LiveFeedLine text={liveFeed} />
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
bun run test src/__tests__/components/triage-transparency-panel.test.tsx
```

Expected: 4 passing

- [ ] **Step 5: Commit**

```bash
git add src/components/consult/TriageTransparencyPanel.tsx src/__tests__/components/triage-transparency-panel.test.tsx
git commit -m "feat(intake): TriageTransparencyPanel shared component"
```

---

## Task 6: Update SwarmChat — Wire New Steps

**Files:**
- Modify: `src/components/consult/SwarmChat.tsx`

This task replaces the free-text symptom input with the new flow. The `step` state machine becomes `"info" | "intake" | "chat"`. The `"confirm"` step is handled inside `IntakeConversation` (it's the final `done=true` question from the API).

- [ ] **Step 1: Rewrite SwarmChat**

Replace the full content of `src/components/consult/SwarmChat.tsx` with:

```tsx
// src/components/consult/SwarmChat.tsx
"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DoctorRole, SwarmEvent, SwarmSynthesis } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";
import { IntakeConversation } from "./IntakeConversation";
import { TriageTransparencyPanel, OrbState } from "./TriageTransparencyPanel";
import { SynthesisCard } from "./SynthesisCard";
import { IntakeAnswer } from "@/lib/intake-types";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

type Step = "info" | "intake" | "chat";

export function SwarmChat() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [patientInfo, setPatientInfo] = useState({ age: "", gender: "", knownConditions: "" });
  // Set by IntakeConversation onComplete
  const [builtSymptoms, setBuiltSymptoms] = useState("");
  const [historySummary, setHistorySummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveFeed, setLiveFeed] = useState("");
  const [orbs, setOrbs] = useState<OrbState[]>([]);
  const [synthesis, setSynthesis] = useState<SwarmSynthesis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateOrb = useCallback((role: DoctorRole, status: OrbState["status"]) => {
    setOrbs((prev) => {
      const existing = prev.find((o) => o.role === role);
      if (!existing) return [...prev, { role, status }];
      return prev.map((o) => o.role === role ? { ...o, status } : o);
    });
  }, []);

  const handleEvent = (event: SwarmEvent) => {
    switch (event.type) {
      case "triage_complete":
        setLiveFeed(`Triage complete: ${event.data.urgency} urgency`);
        break;
      case "doctor_activated":
        updateOrb(event.role, "active");
        setLiveFeed(`${agentRegistry[event.role]?.name ?? event.role} is reviewing your symptoms...`);
        break;
      case "doctor_complete":
        updateOrb(event.role, "done");
        break;
      case "phase_changed":
        if (event.phase === "debate") setLiveFeed("Your care team is discussing your case...");
        if (event.phase === "synthesis") setLiveFeed("Preparing your recommendations...");
        break;
      case "synthesis_complete":
        setSynthesis(event.data);
        trackEvent(ANALYTICS_EVENTS.consultationCompleted, { surface: "swarm_chat", urgency: event.data.urgency });
        setIsLoading(false);
        break;
      case "done":
        setIsLoading(false);
        setLiveFeed("");
        break;
      case "error":
        setError(event.message);
        trackEvent(ANALYTICS_EVENTS.consultationErrored, { surface: "swarm_chat", message: event.message });
        break;
    }
  };

  const startConsultation = async (symptoms: string) => {
    if (!symptoms.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    setSynthesis(null);
    setOrbs([]);
    setLiveFeed("");

    try {
      trackEvent(ANALYTICS_EVENTS.consultationStarted, { surface: "swarm_chat", source: "consult_page" });

      const payload = {
        symptoms,
        patientInfo: {
          age: patientInfo.age,
          gender: patientInfo.gender,
          knownConditions: patientInfo.knownConditions || undefined,
          historySummary: historySummary || undefined,
        },
        stream: true,
        swarm: true,
      };

      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Request failed" }));
        if (res.status === 403 && errBody.redirectTo) {
          router.push(errBody.redirectTo);
          return;
        }
        const msg =
          res.status === 429
            ? `Too many requests. Please wait ${errBody.retryAfter ?? 60} seconds.`
            : errBody.error ?? "Failed to start consultation.";
        setError(msg);
        trackEvent(ANALYTICS_EVENTS.consultationErrored, { surface: "swarm_chat", status: res.status, error: msg });
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.error) { setError(data.error); return; }
        setIsLoading(false);
        return;
      }

      // SSE stream
      const reader = res.body?.getReader();
      if (!reader) { setError("Stream unavailable"); return; }
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          try {
            handleEvent(JSON.parse(payload) as SwarmEvent);
          } catch { /* skip malformed */ }
        }
      }
      decoder.decode();
    } catch {
      setError("Connection issue. Please try again.");
      trackEvent(ANALYTICS_EVENTS.consultationErrored, { surface: "swarm_chat", error: "connection_issue" });
    } finally {
      setIsLoading(false);
      setLiveFeed("");
    }
  };

  const handleReset = () => {
    setStep("info");
    setOrbs([]);
    setSynthesis(null);
    setError(null);
    setLiveFeed("");
    setBuiltSymptoms("");
    setHistorySummary("");
    setPatientInfo({ age: "", gender: "", knownConditions: "" });
  };

  // ── Step: info ──────────────────────────────────────────────────────────────
  if (step === "info") {
    return (
      <div className="w-full max-w-lg mx-auto p-8 space-y-5 border rounded-xl">
        <div className="text-center">
          <div className="text-4xl mb-2">🏥</div>
          <h2 className="text-xl font-bold">Tell us about yourself</h2>
          <p className="text-sm text-muted-foreground mt-1">Helps your AI care team give better guidance</p>
        </div>
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Age"
            aria-label="Age"
            value={patientInfo.age}
            onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
          />
          <div role="group" aria-label="Biological sex" className="flex gap-2">
            {["Male", "Female", "Other"].map((g) => (
              <button
                key={g}
                onClick={() => setPatientInfo({ ...patientInfo, gender: g })}
                className={`flex-1 py-2 rounded-lg border-2 text-sm transition-colors ${
                  patientInfo.gender === g ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Known conditions (optional)"
            value={patientInfo.knownConditions}
            onChange={(e) => setPatientInfo({ ...patientInfo, knownConditions: e.target.value })}
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
          />
        </div>
        <button
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          disabled={!patientInfo.age || !patientInfo.gender}
          onClick={() => setStep("intake")}
        >
          Continue →
        </button>
      </div>
    );
  }

  // ── Step: intake ─────────────────────────────────────────────────────────────
  if (step === "intake") {
    return (
      <div className="w-full max-w-lg mx-auto p-8 space-y-5 border rounded-xl">
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold">What brings you in today?</h2>
          <p className="text-xs text-muted-foreground mt-1">Answer a few questions so your care team is ready</p>
        </div>
        <IntakeConversation
          onComplete={(answers: IntakeAnswer[], symptoms: string, summary: string) => {
            setBuiltSymptoms(symptoms);
            setHistorySummary(summary);
            setStep("chat");
            startConsultation(symptoms);
          }}
        />
      </div>
    );
  }

  // ── Step: chat (consultation in progress / complete) ──────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-2xl mx-auto">
      <TriageTransparencyPanel
        orbs={orbs}
        liveFeed={liveFeed}
        isVisible={orbs.length > 0 || isLoading}
      />

      {synthesis && (
        <div className="mb-4">
          <SynthesisCard synthesis={synthesis} onStartNew={handleReset} />
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-sm text-amber-700 dark:text-amber-300">
          {error}
        </div>
      )}

      {!synthesis && !isLoading && (
        <div className="mt-auto text-center space-y-3 py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Connecting your care team...</p>
        </div>
      )}

      {isLoading && orbs.length === 0 && (
        <div className="mt-auto text-center space-y-3 py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Starting consultation...</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run all tests to verify nothing regressed**

```bash
bun run test
```

Expected: 229+ passing (all previous tests still pass)

- [ ] **Step 3: Commit**

```bash
git add src/components/consult/SwarmChat.tsx
git commit -m "feat(intake): wire SwarmChat — info → intake → chat flow with TriageTransparencyPanel"
```

---

## Task 7: Update HuddleRoom — Add TriageTransparencyPanel

**Files:**
- Modify: `src/components/consult/HuddleRoom.tsx`

Add the `TriageTransparencyPanel` as a collapsible "Team Overview" sidebar panel in HuddleRoom. The doctor already has the full graph view — this adds a compact orb summary so the team status is visible at a glance alongside the existing visualization.

- [ ] **Step 1: Read the current HuddleRoom imports and state (already done — lines 1-25 in the file)**

HuddleRoom already tracks `isRunning` and handles `doctor_activated`/`doctor_complete` events. We need to:
1. Import `TriageTransparencyPanel` and `OrbState`
2. Add `orbState: OrbState[]` + `liveFeedText: string` state vars
3. Update `handleEvent` to keep them in sync
4. Render `TriageTransparencyPanel` in the layout

- [ ] **Step 2: Add import at top of HuddleRoom**

In `src/components/consult/HuddleRoom.tsx`, find the imports block and add:

```typescript
import { TriageTransparencyPanel, OrbState } from "./TriageTransparencyPanel";
```

- [ ] **Step 3: Add orbState and liveFeedText state inside HuddleRoom function**

Find the line `const [isRunning, setIsRunning] = useState(false);` and add after it:

```typescript
const [orbState, setOrbState] = useState<OrbState[]>([]);
const [liveFeedText, setLiveFeedText] = useState("");
```

- [ ] **Step 4: Update handleEvent inside HuddleRoom to maintain orb state**

Inside the `handleEvent` callback in HuddleRoom, find the `case "doctor_activated":` block and add orb tracking after the existing `updateAgent` call:

```typescript
case "doctor_activated":
  updateAgent(event.role, "active");
  // existing code above — add below:
  setOrbState((prev) => {
    const exists = prev.find((o) => o.role === event.role);
    if (!exists) return [...prev, { role: event.role as DoctorRole, status: "active" }];
    return prev.map((o) => o.role === event.role ? { ...o, status: "active" } : o);
  });
  setLiveFeedText(`${leadNames[event.role] ?? event.role} is reviewing...`);
  break;
```

Also find `case "doctor_complete":` and add after existing code:

```typescript
  setOrbState((prev) =>
    prev.map((o) => o.role === event.role ? { ...o, status: "done" as const } : o)
  );
```

Also find `case "synthesis_complete":` and add:

```typescript
  setLiveFeedText("");
```

- [ ] **Step 5: Add TriageTransparencyPanel to HuddleRoom render**

In HuddleRoom's return JSX, find the outermost `<div>` wrapping the content and add `TriageTransparencyPanel` before the graph/agent visualization:

```tsx
<TriageTransparencyPanel
  orbs={orbState}
  liveFeed={liveFeedText}
  isVisible={orbState.length > 0 || isRunning}
/>
```

- [ ] **Step 6: Run tests**

```bash
bun run test src/__tests__/components/huddle-room.test.tsx
bun run test
```

Expected: all passing

- [ ] **Step 7: Commit**

```bash
git add src/components/consult/HuddleRoom.tsx
git commit -m "feat(intake): add TriageTransparencyPanel to HuddleRoom doctor view"
```

---

## Task 8: Extend buildPatientContext — historySummary Pass-Through

**Files:**
- Modify: `src/lib/consultation-intake.ts`
- Test: existing `src/__tests__/lib/consultation-intake.test.ts` if present, otherwise inline

- [ ] **Step 1: Verify `buildPatientContext` already handles `historySummary`**

```bash
grep -n "historySummary" /Users/tasmanstar/Desktop/projects/medicrew/src/lib/consultation-intake.ts
```

Expected output: line showing `historySummary` is already part of `buildPatientContext`. If so, no change needed — the intake data flows through automatically because `SwarmChat` passes `historySummary` as `patientInfo.historySummary`.

- [ ] **Step 2: Write a test confirming the end-to-end context string**

Add to the relevant test file (or create `src/__tests__/lib/intake-context.test.ts`):

```typescript
// src/__tests__/lib/intake-context.test.ts
import { describe, it, expect } from "vitest";
import { buildPatientContext } from "@/lib/consultation-intake";
import { buildSymptomsFromAnswers, buildHistorySummaryFromAnswers } from "@/lib/intake-types";
import type { IntakeAnswer } from "@/lib/intake-types";

const sampleAnswers: IntakeAnswer[] = [
  { questionId: "location", question: "Where is your main symptom?", answer: "Chest" },
  { questionId: "duration", question: "How long?", answer: "A few days" },
  { questionId: "severity", question: "How severe?", answer: "7" },
  { questionId: "emotional", question: "How are you feeling?", answer: "😟 Anxious" },
  { questionId: "associated", question: "Any other symptoms?", answer: "shortness of breath" },
];

describe("intake context building", () => {
  it("buildSymptomsFromAnswers produces natural language symptom string", () => {
    const result = buildSymptomsFromAnswers(sampleAnswers);
    expect(result).toContain("Chest");
    expect(result).toContain("shortness of breath");
    expect(result).not.toContain("confirm"); // confirm answers excluded from symptoms
  });

  it("buildHistorySummaryFromAnswers includes severity and emotional state", () => {
    const result = buildHistorySummaryFromAnswers(sampleAnswers);
    expect(result).toContain("Severity: 7/10");
    expect(result).toContain("Emotional state: Anxious");
  });

  it("buildPatientContext includes historySummary when provided", () => {
    const summary = buildHistorySummaryFromAnswers(sampleAnswers);
    const context = buildPatientContext({
      age: "32",
      gender: "Female",
      historySummary: summary,
    });
    expect(context).toContain("Severity: 7/10");
    expect(context).toContain("Emotional state: Anxious");
  });
});
```

- [ ] **Step 3: Run the test**

```bash
bun run test src/__tests__/lib/intake-context.test.ts
```

Expected: 3 passing

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/lib/intake-context.test.ts
git commit -m "test(intake): verify symptoms + context string building from intake answers"
```

---

## Task 9: Full Regression + Final Commit

- [ ] **Step 1: Run full test suite**

```bash
bun run test
```

Expected: all previous 229 tests still passing, plus 20+ new tests

- [ ] **Step 2: Check the dev server is running and manually verify the flow**

```
1. Open http://localhost:3001/consult
2. Complete the info step (age + gender)
3. Verify body map appears as first question
4. Select a body region → Next is enabled
5. Step through duration, severity, emotional check
6. Submit → watch care team orbs activate
7. Verify TriageTransparencyPanel shows agent activations
8. Verify synthesis card appears at the end
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(intake): guided adaptive intake + triage transparency — complete

- /api/consult/intake: stateless AI question endpoint, static fallback
- IntakeConversation: body map, slider, chips, emotional check, confirm
- TriageTransparencyPanel: shared orb panel in SwarmChat + HuddleRoom
- SwarmChat: info → intake → chat step machine
- HuddleRoom: TriageTransparencyPanel team overview added
- intake-types.ts: IntakeAnswer, IntakeQuestion, builder utils
- 20+ new tests added"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|-------------|------|
| Guided question sequence replacing free-text | Task 4 + Task 6 |
| Adaptive AI-driven questions | Task 2 (AI endpoint) + Task 4 (component) |
| Body map | Task 3 |
| Pain slider (1–10) | Task 4 (slider type in IntakeConversation) |
| Duration chips | Task 2 (static questions) + Task 4 |
| Emotional check | Task 2 (static questions) + Task 4 |
| "Anything to add?" confirm step | Task 2 (`done=true` question) + Task 4 |
| LLM failure fallback to static | Task 2 |
| Triage visible to patient | Task 5 + Task 6 |
| Triage visible to doctor (same component) | Task 5 + Task 7 |
| `historySummary` flows to AI context | Task 1 + Task 8 |
| Tests for all new paths | Tasks 2, 4, 5, 8 |

**Placeholder scan:** None found — all steps contain exact code.

**Type consistency check:**
- `IntakeAnswer` defined in Task 1, used in Tasks 2, 4, 6, 8 ✓
- `IntakeQuestion` defined in Task 1, used in Tasks 2, 4 ✓
- `OrbState` defined in Task 5, used in Tasks 6, 7 ✓
- `buildSymptomsFromAnswers` defined in Task 1, used in Tasks 4, 8 ✓
- `buildHistorySummaryFromAnswers` defined in Task 1, used in Tasks 4, 8 ✓
- `TriageTransparencyPanel` defined in Task 5, imported in Tasks 6, 7 ✓
