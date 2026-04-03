import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedPatient } from "@/lib/auth";
import { createModel } from "@/lib/ai/config";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AGENT_COMPLIANCE_RULE, AHPRA_DISCLAIMER } from "@/lib/compliance";

export const dynamic = "force-dynamic";

const REFERRAL_LETTER_SYSTEM_PROMPT = `You are a clinical documentation assistant for MediCrew, an AI-assisted health navigation platform in Australia.

Your task is to generate a professional GP referral letter based on a patient's consultation summary. The letter should help the patient's GP understand their presenting complaint and the AI care team's assessment.

${AGENT_COMPLIANCE_RULE}

IMPORTANT AHPRA COMPLIANCE RULES:
- Never state a diagnosis (e.g., never write "the patient has [condition]")
- Use language like "symptoms consistent with", "may warrant investigation for", "could be worth discussing"
- Frame everything as patient-reported symptoms and AI-assisted triage, not clinical diagnosis
- Always note this is AI-assisted and clinical judgement rests with the treating GP
- Do not recommend specific medications or treatments

LETTER FORMAT:
- Professional medical letter format
- Addressed "To: The Treating GP"
- Include: presenting complaint, AI care team assessment (hedged language), red flags identified, relevant background, suggested questions/considerations for the GP
- Closing from "MediCrew AI Care Team"
- Include the AHPRA disclaimer at the end

Return ONLY the letter text, ready to display. No preamble or meta-commentary.`;

function buildLetterPrompt(data: {
  patientName: string;
  patientAge: string;
  patientGender: string | null;
  symptoms: string;
  urgencyLevel: string | null;
  redFlags: string[];
  assessment: string | null;
  nextSteps: string[];
  knownConditions: string | null;
  medications: string[];
  allergies: string[];
  consultationDate: string;
  consultationRef: string;
}): string {
  const lines: string[] = [
    `Patient: ${data.patientName}`,
    `Age: ${data.patientAge}`,
  ];
  if (data.patientGender) lines.push(`Gender: ${data.patientGender}`);
  lines.push(
    `Consultation Date: ${data.consultationDate}`,
    `Reference: ${data.consultationRef}`,
    `Urgency Assessment: ${data.urgencyLevel ?? "routine"}`,
    ``,
    `PRESENTING COMPLAINT:`,
    data.symptoms,
  );

  if (data.redFlags.length > 0) {
    lines.push(
      ``,
      `RED FLAGS IDENTIFIED:`,
      ...data.redFlags.map((f) => `- ${f}`),
    );
  }

  if (data.assessment) {
    lines.push(``, `AI CARE TEAM ASSESSMENT:`, data.assessment);
  }

  if (data.nextSteps.length > 0) {
    lines.push(
      ``,
      `RECOMMENDED NEXT STEPS:`,
      ...data.nextSteps.map((s) => `- ${s}`),
    );
  }

  if (data.knownConditions) {
    lines.push(``, `KNOWN CONDITIONS: ${data.knownConditions}`);
  }

  if (data.medications.length > 0) {
    lines.push(`CURRENT MEDICATIONS: ${data.medications.join(", ")}`);
  }

  if (data.allergies.length > 0) {
    lines.push(`ALLERGIES: ${data.allergies.join(", ")}`);
  }

  lines.push(``, `AHPRA DISCLAIMER: ${AHPRA_DISCLAIMER}`);

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const { patient, needsOnboarding, error } = await getAuthenticatedPatient();
  if (error) return error;
  if (needsOnboarding) {
    return NextResponse.json(
      { error: "Onboarding required", redirect: "/onboarding" },
      { status: 403 },
    );
  }

  const patientId = patient!.id;

  // Pro gating — only Pro/partner subscribers can generate referral letters
  const patientRecord = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      subscriptionPlan: true,
      subscriptionStatus: true,
      name: true,
      dateOfBirth: true,
      gender: true,
      knownConditions: true,
      medications: true,
      allergies: true,
    },
  });

  if (!patientRecord) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const plan = patientRecord.subscriptionPlan ?? "free";
  const status = patientRecord.subscriptionStatus ?? "active";
  const isPro =
    (plan === "pro" || plan === "partner") &&
    (status === "active" || status === "trialing");

  if (!isPro) {
    return NextResponse.json(
      {
        error: "Pro subscription required",
        reason:
          "GP referral letter generation is a Pro feature. Upgrade to access this and other premium features.",
        upgradeUrl: "/pricing",
      },
      { status: 402 },
    );
  }

  let body: { consultationId?: string };
  try {
    body = (await request.json()) as { consultationId?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { consultationId } = body;
  if (!consultationId) {
    return NextResponse.json(
      { error: "consultationId is required" },
      { status: 400 },
    );
  }

  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, patientId },
    select: {
      id: true,
      symptoms: true,
      urgencyLevel: true,
      redFlags: true,
      recommendation: true,
      referralLetter: true,
      referralLetterAt: true,
      createdAt: true,
    },
  });

  if (!consultation) {
    return NextResponse.json(
      { error: "Consultation not found" },
      { status: 404 },
    );
  }

  // Return cached letter if already generated
  if (consultation.referralLetter) {
    return NextResponse.json({
      letter: consultation.referralLetter,
      generatedAt: consultation.referralLetterAt,
      cached: true,
    });
  }

  // Parse stored JSON fields
  let redFlags: string[] = [];
  if (consultation.redFlags) {
    try {
      const parsed = JSON.parse(consultation.redFlags);
      if (Array.isArray(parsed)) redFlags = parsed;
    } catch {
      redFlags = [];
    }
  }

  type SwarmSynthesis = {
    primaryRecommendation?: string;
    nextSteps?: string[];
  };
  const rec = consultation.recommendation as SwarmSynthesis | null;

  let medications: string[] = [];
  if (patientRecord.medications) {
    try {
      const parsed = JSON.parse(patientRecord.medications);
      if (Array.isArray(parsed)) medications = parsed;
    } catch {
      medications = [];
    }
  }

  let allergies: string[] = [];
  if (patientRecord.allergies) {
    try {
      const parsed = JSON.parse(patientRecord.allergies);
      if (Array.isArray(parsed)) allergies = parsed;
    } catch {
      allergies = [];
    }
  }

  // Calculate age
  let patientAge = "Unknown";
  if (patientRecord.dateOfBirth) {
    const diff = Date.now() - new Date(patientRecord.dateOfBirth).getTime();
    patientAge = `${Math.floor(diff / (365.25 * 24 * 3600000))} years`;
  }

  const consultationDate = new Date(consultation.createdAt).toLocaleDateString(
    "en-AU",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Australia/Sydney",
    },
  );

  const prompt = buildLetterPrompt({
    patientName: patientRecord.name,
    patientAge,
    patientGender: patientRecord.gender,
    symptoms: consultation.symptoms,
    urgencyLevel: consultation.urgencyLevel,
    redFlags,
    assessment: rec?.primaryRecommendation ?? null,
    nextSteps: rec?.nextSteps ?? [],
    knownConditions: patientRecord.knownConditions,
    medications,
    allergies,
    consultationDate,
    consultationRef: consultation.id.slice(0, 8).toUpperCase(),
  });

  let letterText: string;
  try {
    const model = createModel(0.3);
    const response = await model.invoke([
      new SystemMessage(REFERRAL_LETTER_SYSTEM_PROMPT),
      new HumanMessage(prompt),
    ]);
    letterText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
  } catch (err) {
    console.error("[referral/generate] LLM error:", err);
    return NextResponse.json(
      { error: "Failed to generate letter. Please try again." },
      { status: 503 },
    );
  }

  // Persist the generated letter
  await prisma.consultation.update({
    where: { id: consultationId },
    data: {
      referralLetter: letterText,
      referralLetterAt: new Date(),
    },
  });

  return NextResponse.json({
    letter: letterText,
    generatedAt: new Date().toISOString(),
    cached: false,
  });
}
