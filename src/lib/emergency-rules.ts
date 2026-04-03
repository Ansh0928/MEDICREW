export interface EmergencyResult {
  isEmergency: boolean;
  category:
    | "cardiac"
    | "stroke"
    | "suicide"
    | "respiratory"
    | "bleeding"
    | "overdose"
    | null;
  response: {
    urgency: "emergency";
    message: string;
    callToAction: "000";
    additionalLine?: string;
  } | null;
}

const EMERGENCY_PATTERNS: Array<{
  regex: RegExp;
  category: NonNullable<EmergencyResult["category"]>;
  addLifeline?: boolean;
}> = [
  { regex: /chest pain|heart attack|myocardial/i, category: "cardiac" },
  {
    regex: /stroke|FAST|face drooping|arm weak|speech slurred/i,
    category: "stroke",
  },
  {
    regex: /suicid|want to (kill|harm) (my|them)self|self.harm/i,
    category: "suicide",
    addLifeline: true,
  },
  {
    regex: /can'?t breathe|difficulty breathing|choking/i,
    category: "respiratory",
  },
  { regex: /severe bleeding|uncontrolled bleeding/i, category: "bleeding" },
  { regex: /overdose|took too many|poisoning/i, category: "overdose" },
  { regex: /unconscious|not breathing|no pulse/i, category: "cardiac" },
  { regex: /call 000|anaphylaxis|severe allergic/i, category: "cardiac" },
];

export function detectEmergency(text: string): EmergencyResult {
  for (const { regex, category, addLifeline } of EMERGENCY_PATTERNS) {
    if (regex.test(text)) {
      return {
        isEmergency: true,
        category,
        response: {
          urgency: "emergency",
          message:
            "This sounds like a medical emergency. Please call 000 immediately or go to your nearest emergency department.",
          callToAction: "000",
          additionalLine: addLifeline
            ? "If you or someone you know is in crisis, contact Lifeline: 13 11 14 (available 24/7)"
            : undefined,
        },
      };
    }
  }
  return { isEmergency: false, category: null, response: null };
}
