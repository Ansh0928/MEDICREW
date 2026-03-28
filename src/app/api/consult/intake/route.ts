// src/app/api/consult/intake/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedPatient } from "@/lib/auth";
import { detectEmergency } from "@/lib/emergency-rules";
import { createFastModel } from "@/lib/ai/config";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { IntakeAnswer, IntakeQuestion, INTAKE_QUESTION_IDS } from "@/lib/intake-types";

const MAX_ANSWERS = 10;

// ── Static fallback questions ─────────────────────────────────────────────────
const STATIC_QUESTIONS: IntakeQuestion[] = [
  {
    questionId: INTAKE_QUESTION_IDS.location,
    question: "Where is your main symptom?",
    type: "body-map",
    done: false,
  },
  {
    questionId: INTAKE_QUESTION_IDS.duration,
    question: "How long has this been going on?",
    type: "chips",
    options: ["Today", "A few days", "1–2 weeks", "Months"],
    done: false,
  },
  {
    questionId: INTAKE_QUESTION_IDS.severity,
    question: "How severe is it?",
    type: "slider",
    min: 1,
    max: 10,
    done: false,
  },
  {
    questionId: INTAKE_QUESTION_IDS.associated,
    question: "Any other symptoms alongside this?",
    type: "text",
    done: false,
  },
  {
    questionId: INTAKE_QUESTION_IDS.emotional,
    question: "How are you feeling about this?",
    type: "emotional",
    options: ["😟 Anxious", "😔 Worried", "😐 Unsure", "😌 Calm"],
    done: false,
  },
  {
    questionId: INTAKE_QUESTION_IDS.confirm,
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
  const { needsOnboarding, error: authError } = await getAuthenticatedPatient();
  if (authError) return authError;
  if (needsOnboarding) {
    return NextResponse.json({ error: "Onboarding required" }, { status: 403 });
  }

  const bodyResult = IntakeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: bodyResult.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { answers } = bodyResult.data;

  if (answers.length >= MAX_ANSWERS) {
    return NextResponse.json(CONFIRM_QUESTION);
  }

  if (answers.length === 0) {
    return NextResponse.json(STATIC_QUESTIONS[0]);
  }

  // Emergency detection — runs before any LLM call (CLAUDE.md compliance rule)
  const candidateText = answers.map((a) => a.answer).join(" ");
  const emergency = detectEmergency(candidateText);
  if (emergency.isEmergency) {
    return NextResponse.json(emergency.response, { status: 200 });
  }

  try {
    const question = await getAIQuestion(answers);
    return NextResponse.json(question);
  } catch {
    console.warn("[intake] LLM fallback at step", answers.length);
    return NextResponse.json(nextStaticQuestion(answers));
  }
}
