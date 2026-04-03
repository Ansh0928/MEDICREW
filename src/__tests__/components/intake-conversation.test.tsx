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
      expect(
        screen.getByText("Where is your main symptom?"),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Body diagram — tap to select location"),
      ).toBeInTheDocument();
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
    await waitFor(() =>
      screen.getByText("Anything else you'd like the care team to know?"),
    );
    await user.click(screen.getByRole("button", { name: /submit/i }));
    expect(onComplete).toHaveBeenCalledWith(
      expect.any(Array), // answers
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
