// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation since the component may use it transitively
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { CareSummary } from "@/components/consult/CareSummary";
import { AHPRA_DISCLAIMER } from "@/lib/compliance";

function makeRec(overrides = {}) {
  return {
    urgency: "routine",
    summary: "Test summary",
    nextSteps: ["See a GP", "Rest"],
    questionsForDoctor: ["What caused this?"],
    timeframe: "Within 1 week",
    disclaimer: AHPRA_DISCLAIMER,
    ...overrides,
  };
}

describe("CONS-04: Care summary component", () => {
  it("CareSummary renders urgency level badge", () => {
    render(
      createElement(CareSummary, {
        recommendation: makeRec({ urgency: "urgent" }),
      }),
    );
    expect(screen.getByText("Urgent")).toBeTruthy();
  });

  it("CareSummary renders nextSteps list", () => {
    render(createElement(CareSummary, { recommendation: makeRec() }));
    expect(screen.getByText("See a GP")).toBeTruthy();
    expect(screen.getByText("Rest")).toBeTruthy();
  });

  it("CareSummary renders questionsForDoctor list", () => {
    render(createElement(CareSummary, { recommendation: makeRec() }));
    expect(screen.getByText("What caused this?")).toBeTruthy();
  });

  it("CareSummary renders AHPRA disclaimer text", () => {
    render(createElement(CareSummary, { recommendation: makeRec() }));
    expect(screen.getByText(AHPRA_DISCLAIMER)).toBeTruthy();
  });
});
