// Tests: consent gate in /api/consult route
import { describe, test } from "vitest";

describe("COMP-04: Consent gate", () => {
  test.todo("checkConsent returns false when no PatientConsent record exists");
  test.todo("checkConsent returns true when valid PatientConsent record exists");
  test.todo("consultation route returns 403 when consent is missing");
});
