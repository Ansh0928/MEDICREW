import { describe, test, expect } from "vitest";
import { AHPRA_DISCLAIMER, AGENT_COMPLIANCE_RULE } from "@/lib/compliance";

describe("COMP-01: AHPRA disclaimer", () => {
  test("contains 'health information, not medical diagnosis'", () => {
    expect(AHPRA_DISCLAIMER).toContain(
      "health information, not medical diagnosis",
    );
  });

  test("contains 'registered healthcare professional'", () => {
    expect(AHPRA_DISCLAIMER).toContain("registered healthcare professional");
  });

  test("contains 'call 000'", () => {
    expect(AHPRA_DISCLAIMER).toContain("call 000");
  });

  test("AGENT_COMPLIANCE_RULE forbids diagnostic language", () => {
    expect(AGENT_COMPLIANCE_RULE).toContain("you have [condition]");
  });
});
