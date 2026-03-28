// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TriageTransparencyPanel } from "@/components/consult/TriageTransparencyPanel";
import type { OrbState } from "@/components/consult/TriageTransparencyPanel";

// Mock framer-motion to avoid animation complexity in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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
