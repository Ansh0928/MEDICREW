// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TriageTransparencyPanel } from "@/components/consult/TriageTransparencyPanel";
import type { OrbState } from "@/components/consult/TriageTransparencyPanel";

vi.mock("@/components/consult/DoctorOrbRow", () => ({
  DoctorOrbRow: ({
    orbs,
  }: {
    orbs: Array<{ role: string; status: string }>;
  }) => <div data-testid="doctor-orb-row" data-orb-count={orbs.length} />,
}));

vi.mock("@/components/consult/LiveFeedLine", () => ({
  LiveFeedLine: ({ text }: { text: string }) => (
    <div data-testid="live-feed-line">{text}</div>
  ),
}));

describe("TriageTransparencyPanel", () => {
  it("renders nothing when isVisible is false", () => {
    const { container } = render(
      <TriageTransparencyPanel orbs={[]} liveFeed="" isVisible={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders orbs when visible", () => {
    const orbs: OrbState[] = [
      { role: "gp", status: "active" },
      { role: "cardiology", status: "waiting" },
    ];
    render(
      <TriageTransparencyPanel orbs={orbs} liveFeed="" isVisible={true} />,
    );
    const orbRow = screen.getByTestId("doctor-orb-row");
    expect(orbRow).toBeInTheDocument();
    expect(orbRow.getAttribute("data-orb-count")).toBe("2");
  });

  it("renders live feed text when provided", () => {
    render(
      <TriageTransparencyPanel
        orbs={[]}
        liveFeed="Jordan AI is reviewing your symptoms..."
        isVisible={true}
      />,
    );
    expect(screen.getByTestId("live-feed-line")).toHaveTextContent(
      /jordan ai is reviewing/i,
    );
  });

  it("renders 'Your care team' heading", () => {
    render(
      <TriageTransparencyPanel
        orbs={[{ role: "gp", status: "done" }]}
        liveFeed=""
        isVisible={true}
      />,
    );
    expect(screen.getByText(/your care team/i)).toBeInTheDocument();
  });
});
