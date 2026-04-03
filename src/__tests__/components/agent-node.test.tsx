// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentNode } from "@/components/consult/AgentNode";

describe("AgentNode", () => {
  const base = {
    name: "Emma AI",
    role: "physiotherapy",
    avatarSeed: "Emma",
    x: 50,
    y: 50,
  };

  it("renders avatar img with correct DiceBear URL", () => {
    render(<AgentNode {...base} state="idle" />);
    const img = screen.getByRole("img", { name: /Emma AI/ });
    expect(img.getAttribute("src")).toContain("notionists-neutral");
    expect(img.getAttribute("src")).toContain("seed=Emma");
  });

  it("renders speech bubble when speaking and bubble text provided", () => {
    render(
      <AgentNode
        {...base}
        state="speaking"
        bubbleText="Back pain may indicate..."
      />,
    );
    expect(screen.getByText(/Back pain may indicate/)).toBeTruthy();
  });

  it("does not render speech bubble when idle", () => {
    render(<AgentNode {...base} state="idle" bubbleText="hidden text" />);
    expect(screen.queryByText(/hidden text/)).toBeNull();
  });

  it("renders done checkmark when state is done", () => {
    render(<AgentNode {...base} state="done" />);
    expect(screen.getByTestId("agent-done-indicator")).toBeTruthy();
  });
});
