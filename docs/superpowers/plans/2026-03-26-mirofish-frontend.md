# MiroFish Swarm — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the animated huddle UI (agents in a circle, speech bubbles, SVG debate lines, follow-up Q&A bar) and wrap it in a Heidi Health-inspired 3-column app shell (sidebar + sessions list + main workspace), replacing the existing SwarmChat component on the doctor consultation page.

**Architecture:** All components are React client components consuming the SSE event stream from `/api/swarm/start` and `/api/swarm/followup`. `HuddleRoom` is the root component managing stream state; it renders `AgentNode` instances positioned with inline `style` trigonometry, a `HuddleConnections` SVG overlay, a `HuddleChatPanel` for the live debate feed, and a `FollowUpBar` for Q&A. `AppShell` wraps everything in the 3-column layout. Existing shadcn/ui primitives are used throughout — no new UI library added.

**Tech Stack:** React 18 + Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui (`badge`, `button`, `input`, `scroll-area`), DiceBear `notionists-neutral` avatars, vitest + `@testing-library/react` for component tests.

**Depends on:** Backend plan (`2026-03-26-mirofish-backend.md`) must be complete — specifically `SwarmEvent` types from `src/agents/swarm-types.ts`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/consult/AgentNode.tsx` | Single agent circle: avatar + name + animated state ring + speech bubble |
| Create | `src/components/consult/HuddleConnections.tsx` | SVG overlay: dashed lines between debating agents |
| Create | `src/components/consult/HuddleChatPanel.tsx` | Right-side live debate feed |
| Create | `src/components/consult/RoutingChip.tsx` | Follow-up routing decision badge |
| Create | `src/components/consult/FollowUpBar.tsx` | Bottom Q&A input bar |
| Create | `src/components/consult/HuddleRoom.tsx` | Root: manages SSE, owns all huddle state, composes sub-components |
| Create | `src/components/layout/AppShell.tsx` | 3-column layout: sidebar + sessions + main |
| Create | `src/components/layout/Sidebar.tsx` | Left nav: logo, nav items, doctor profile |
| Create | `src/components/layout/SessionsColumn.tsx` | Sessions list with tabs + patient rows |
| Modify | `src/app/doctor/page.tsx` | Replace existing content with AppShell + HuddleRoom |
| Create | `src/__tests__/components/agent-node.test.tsx` | Unit: AgentNode renders correct avatar URL + states |
| Create | `src/__tests__/components/huddle-room.test.tsx` | Unit: HuddleRoom circle geometry helpers |

---

## Task 1: AgentNode component

**Files:**
- Create: `src/components/consult/AgentNode.tsx`
- Test: `src/__tests__/components/agent-node.test.tsx`

AgentNode renders one agent in the huddle. It receives position (`x`, `y`) as percentages from the parent, a state (`idle | active | speaking | done`), an optional speech bubble text, and agent metadata (name, role, avatar seed).

- [ ] **Step 1.1: Write the failing test**

```typescript
// src/__tests__/components/agent-node.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentNode } from '@/components/consult/AgentNode';

describe('AgentNode', () => {
  const base = { name: 'Emma AI', role: 'physiotherapy', avatarSeed: 'Emma', x: 50, y: 50 };

  it('renders avatar img with correct DiceBear URL', () => {
    render(<AgentNode {...base} state="idle" />);
    const img = screen.getByRole('img', { name: /Emma AI/ });
    expect(img.getAttribute('src')).toContain('notionists-neutral');
    expect(img.getAttribute('src')).toContain('seed=Emma');
  });

  it('renders speech bubble when speaking and bubble text provided', () => {
    render(<AgentNode {...base} state="speaking" bubbleText="Back pain may indicate..." />);
    expect(screen.getByText(/Back pain may indicate/)).toBeTruthy();
  });

  it('does not render speech bubble when idle', () => {
    render(<AgentNode {...base} state="idle" bubbleText="hidden text" />);
    expect(screen.queryByText(/hidden text/)).toBeNull();
  });

  it('renders done checkmark when state is done', () => {
    render(<AgentNode {...base} state="done" />);
    expect(screen.getByTestId('agent-done-indicator')).toBeTruthy();
  });
});
```

- [ ] **Step 1.2: Run to verify it fails**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/components/agent-node.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 1.3: Create AgentNode.tsx**

```tsx
// src/components/consult/AgentNode.tsx
"use client";

export type AgentState = "idle" | "active" | "speaking" | "done";

export interface AgentNodeProps {
  name: string;
  role: string;
  avatarSeed: string;
  x: number;        // centre x as px offset from container centre
  y: number;        // centre y as px offset from container centre
  state: AgentState;
  bubbleText?: string;
  isCenter?: boolean;
}

/** Bubble anchor: based on whether agent is left/right/top/bottom of centre */
function bubbleAnchor(x: number, y: number): string {
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  if (absX > absY) {
    // predominantly left or right
    return x > 0 ? "right-full mr-2 top-0" : "left-full ml-2 top-0";
  }
  return y > 0 ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : "top-full mt-2 left-1/2 -translate-x-1/2";
}

export function AgentNode({ name, avatarSeed, x, y, state, bubbleText, isCenter }: AgentNodeProps) {
  const avatarUrl = `https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${encodeURIComponent(avatarSeed)}&size=48`;

  const ringClass = {
    idle: "ring-2 ring-gray-200",
    active: "ring-2 ring-blue-400 animate-pulse",
    speaking: "ring-2 ring-green-400 animate-pulse",
    done: "ring-2 ring-green-500",
  }[state];

  const size = isCenter ? "w-16 h-16" : "w-12 h-12";

  return (
    <div
      className="absolute flex flex-col items-center gap-1"
      style={{ transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`, left: "50%", top: "50%" }}
    >
      {/* Speech bubble */}
      {(state === "speaking" || state === "active") && bubbleText && (
        <div className={`absolute z-10 bg-white border border-gray-200 rounded-lg shadow-sm px-2 py-1 text-xs text-gray-700 max-w-[140px] leading-tight whitespace-normal ${bubbleAnchor(x, y)}`}>
          {bubbleText}
        </div>
      )}

      {/* Avatar circle */}
      <div className={`relative rounded-full overflow-hidden bg-gray-100 ${size} ${ringClass} flex-shrink-0`}>
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
        {state === "done" && (
          <div
            data-testid="agent-done-indicator"
            className="absolute inset-0 bg-green-500/20 flex items-center justify-center"
          >
            <span className="text-green-600 text-sm font-bold">✓</span>
          </div>
        )}
      </div>

      {/* Name label */}
      <span className="text-xs text-gray-600 text-center leading-none max-w-[80px] truncate">
        {name}
      </span>
    </div>
  );
}
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/components/agent-node.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 1.5: Commit**

```bash
git add src/components/consult/AgentNode.tsx src/__tests__/components/agent-node.test.tsx
git commit -m "feat(ui): add AgentNode component with state rings and speech bubbles"
```

---

## Task 2: HuddleConnections SVG overlay

**Files:**
- Create: `src/components/consult/HuddleConnections.tsx`

No dedicated test — geometry is visual. This component receives a list of debate connections and draws SVG dashed lines between agent positions.

- [ ] **Step 2.1: Create HuddleConnections.tsx**

```tsx
// src/components/consult/HuddleConnections.tsx
"use client";

export type ConnectionType = "agree" | "challenge" | "add_context";

export interface HuddleConnection {
  id: string;
  fromX: number; fromY: number;
  toX: number;   toY: number;
  type: ConnectionType;
}

const colorMap: Record<ConnectionType, string> = {
  agree: "#22c55e",        // green-500
  challenge: "#f97316",   // orange-500
  add_context: "#3b82f6", // blue-500
};

export function HuddleConnections({
  connections,
  width,
  height,
}: {
  connections: HuddleConnection[];
  width: number;
  height: number;
}) {
  if (connections.length === 0) return null;

  // Convert agent offsets (centred at 0,0) to SVG coordinates (origin top-left)
  const cx = width / 2;
  const cy = height / 2;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ zIndex: 0 }}
    >
      {connections.map((conn) => (
        <line
          key={conn.id}
          x1={cx + conn.fromX}
          y1={cy + conn.fromY}
          x2={cx + conn.toX}
          y2={cy + conn.toY}
          stroke={colorMap[conn.type]}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          strokeOpacity={0.7}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2.2: Commit**

```bash
git add src/components/consult/HuddleConnections.tsx
git commit -m "feat(ui): add HuddleConnections SVG overlay for debate lines"
```

---

## Task 3: HuddleChatPanel — live debate feed

**Files:**
- Create: `src/components/consult/HuddleChatPanel.tsx`

- [ ] **Step 3.1: Create HuddleChatPanel.tsx**

```tsx
// src/components/consult/HuddleChatPanel.tsx
"use client";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface ChatMessage {
  id: string;
  agentName: string;
  content: string;
  type: "hypothesis" | "debate" | "rectification" | "mdt" | "system";
  messageType?: "agree" | "challenge" | "add_context" | "agree" | "note" | "escalate";
}

const typeColors: Record<string, string> = {
  agree: "bg-green-100 text-green-800",
  challenge: "bg-orange-100 text-orange-800",
  add_context: "bg-blue-100 text-blue-800",
  note: "bg-blue-100 text-blue-800",
  escalate: "bg-red-100 text-red-800",
  hypothesis: "bg-purple-100 text-purple-800",
  rectification: "bg-gray-100 text-gray-800",
  system: "bg-gray-50 text-gray-500",
};

export function HuddleChatPanel({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full border-l border-gray-100">
      <div className="px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Team Discussion</span>
      </div>
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">{msg.agentName}</span>
                {msg.messageType && (
                  <Badge className={`text-[10px] px-1 py-0 h-4 ${typeColors[msg.messageType] ?? ""}`}>
                    {msg.messageType.replace("_", " ")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 leading-snug">{msg.content}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/components/consult/HuddleChatPanel.tsx
git commit -m "feat(ui): add HuddleChatPanel live debate feed"
```

---

## Task 4: RoutingChip and FollowUpBar

**Files:**
- Create: `src/components/consult/RoutingChip.tsx`
- Create: `src/components/consult/FollowUpBar.tsx`

- [ ] **Step 4.1: Create RoutingChip.tsx**

```tsx
// src/components/consult/RoutingChip.tsx
"use client";
import { Badge } from "@/components/ui/badge";

export function RoutingChip({ questionType, activatedRoles }: { questionType: "simple" | "complex"; activatedRoles: string[] }) {
  if (questionType === "simple") {
    return (
      <Badge className="bg-blue-50 text-blue-700 text-xs font-normal">
        Routing to lead specialist directly
      </Badge>
    );
  }
  return (
    <Badge className="bg-orange-50 text-orange-700 text-xs font-normal">
      Re-activating: {activatedRoles.join(", ")} residents
    </Badge>
  );
}
```

- [ ] **Step 4.2: Create FollowUpBar.tsx**

```tsx
// src/components/consult/FollowUpBar.tsx
"use client";
import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FollowUpBarProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FollowUpBar({ onSubmit, disabled, placeholder = "Ask a follow-up question…" }: FollowUpBarProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    if (!q) return;
    onSubmit(q);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 text-sm"
      />
      <Button onClick={submit} disabled={disabled || !value.trim()} size="sm">
        Send
      </Button>
    </div>
  );
}
```

- [ ] **Step 4.3: Commit**

```bash
git add src/components/consult/RoutingChip.tsx src/components/consult/FollowUpBar.tsx
git commit -m "feat(ui): add RoutingChip and FollowUpBar for Q&A flow"
```

---

## Task 4.5: Update SynthesisCard for new SwarmSynthesis shape

**Files:**
- Modify: `src/components/consult/SynthesisCard.tsx`

The existing `SynthesisCard` was written for the old `SwarmSynthesis` shape (`rankedHypotheses`, `questionsForDoctor`, `timeframe`) and requires an `onStartNew` prop. The new shape is `{ urgency, primaryRecommendation, nextSteps, bookingNeeded, disclaimer }`. This must be done before Task 5 or `tsc --noEmit` will fail.

- [ ] **Step 4.5.1: Read the existing SynthesisCard**

```bash
cat /Users/tasmanstar/Desktop/projects/medicrew/src/components/consult/SynthesisCard.tsx
```

- [ ] **Step 4.5.2: Rewrite SynthesisCard for new shape**

Replace the component body to accept the new `SwarmSynthesis` type. Remove the required `onStartNew` prop (add as optional with a no-op default). Example:

```tsx
// src/components/consult/SynthesisCard.tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwarmSynthesis } from "@/agents/swarm-types";

const urgencyColors: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  urgent: "bg-orange-100 text-orange-700",
  routine: "bg-green-100 text-green-700",
  self_care: "bg-blue-100 text-blue-700",
};

interface SynthesisCardProps {
  synthesis: SwarmSynthesis;
  onStartNew?: () => void;
}

export function SynthesisCard({ synthesis, onStartNew }: SynthesisCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={urgencyColors[synthesis.urgency] ?? ""}>{synthesis.urgency}</Badge>
        <span className="text-sm font-medium text-gray-900">Team Recommendation</span>
      </div>
      <p className="text-sm text-gray-700">{synthesis.primaryRecommendation}</p>
      {synthesis.nextSteps.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
          {synthesis.nextSteps.map((step, i) => <li key={i}>{step}</li>)}
        </ul>
      )}
      {synthesis.bookingNeeded && (
        <p className="text-xs text-blue-600 font-medium">Booking with a healthcare provider is recommended.</p>
      )}
      <p className="text-[10px] text-gray-400">{synthesis.disclaimer}</p>
      {onStartNew && (
        <Button variant="outline" size="sm" onClick={onStartNew}>Start new consultation</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4.5.3: TypeScript check**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors (requires backend plan already complete).

- [ ] **Step 4.5.4: Commit**

```bash
git add src/components/consult/SynthesisCard.tsx
git commit -m "feat(ui): update SynthesisCard for new SwarmSynthesis shape (primaryRecommendation, nextSteps, bookingNeeded)"
```

---

## Task 5: HuddleRoom — main orchestrator component

**Files:**
- Create: `src/components/consult/HuddleRoom.tsx`
- Test: `src/__tests__/components/huddle-room.test.tsx`

This is the largest component. It owns the SSE stream, maps events to visual state (agent positions, speech bubbles, connections), and composes all sub-components.

- [ ] **Step 5.0: Verify backend plan has landed**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && grep -n "rectification_complete\|mdt_message\|residentRole\|primaryLeadRole" src/agents/swarm-types.ts
```
Expected: All 4 terms found. If any are missing, stop and complete `2026-03-26-mirofish-backend.md` before continuing.

- [ ] **Step 5.1: Write the failing test (geometry helpers)**

```typescript
// src/__tests__/components/huddle-room.test.tsx
import { describe, it, expect } from 'vitest';
import { computeAgentPositions } from '@/components/consult/HuddleRoom';

describe('computeAgentPositions', () => {
  it('places primary lead at centre (0,0)', () => {
    const positions = computeAgentPositions(['physiotherapy'], ['physiotherapy', 'gp', 'conservative', 'pharmacological', 'investigative', 'red-flag'], 160);
    expect(positions['physiotherapy']).toEqual({ x: 0, y: 0, isCenter: true });
  });

  it('places outer agents at the given radius', () => {
    const outer = ['gp', 'conservative', 'pharmacological'];
    const positions = computeAgentPositions(['physiotherapy'], ['physiotherapy', ...outer], 160);
    for (const role of outer) {
      const pos = positions[role];
      const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
      expect(Math.round(dist)).toBeCloseTo(160, 0);
    }
  });

  it('scales radius to 200 when >10 outer agents', () => {
    const outer = Array.from({ length: 11 }, (_, i) => `agent-${i}`);
    const positions = computeAgentPositions(['lead'], ['lead', ...outer], 160);
    const pos = positions['agent-0'];
    const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
    expect(dist).toBeCloseTo(200, 0);
  });
});
```

- [ ] **Step 5.2: Run to verify it fails**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/components/huddle-room.test.tsx
```
Expected: FAIL — `computeAgentPositions` not exported.

- [ ] **Step 5.3: Create HuddleRoom.tsx**

```tsx
// src/components/consult/HuddleRoom.tsx
"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { AgentNode, AgentState, AgentNodeProps } from "./AgentNode";
import { HuddleConnections, HuddleConnection } from "./HuddleConnections";
import { HuddleChatPanel, ChatMessage } from "./HuddleChatPanel";
import { FollowUpBar } from "./FollowUpBar";
import { RoutingChip } from "./RoutingChip";
import { SynthesisCard } from "./SynthesisCard";
import { SwarmEvent, SwarmSynthesis } from "@/agents/swarm-types";
import { agentRegistry } from "@/agents/definitions";

// ── Geometry ─────────────────────────────────────────────────────────────────

export interface AgentPosition {
  x: number;
  y: number;
  isCenter: boolean;
}

/**
 * Computes pixel offsets (from container centre) for all agents.
 * Primary lead is at (0,0); all others evenly spaced on a circle.
 * Exported for testing.
 */
export function computeAgentPositions(
  primaryLeadRoles: string[],
  allRoles: string[],
  baseRadius: number
): Record<string, AgentPosition> {
  const primaryLead = primaryLeadRoles[0] ?? allRoles[0];
  const outer = allRoles.filter((r) => r !== primaryLead);
  const radius = outer.length > 10 ? 200 : baseRadius;
  const positions: Record<string, AgentPosition> = {};

  positions[primaryLead] = { x: 0, y: 0, isCenter: true };

  outer.forEach((role, i) => {
    const angle = (2 * Math.PI * i) / outer.length - Math.PI / 2;
    positions[role] = {
      x: Math.round(radius * Math.cos(angle)),
      y: Math.round(radius * Math.sin(angle)),
      isCenter: false,
    };
  });

  return positions;
}

// ── Agent display names ───────────────────────────────────────────────────────

const residentNames: Record<string, string> = {
  conservative: "Kai",
  pharmacological: "Priya",
  investigative: "Zoe",
  "red-flag": "Sam",
};

function getAgentDisplayName(role: string): string {
  return residentNames[role] ?? agentRegistry[role as keyof typeof agentRegistry]?.name ?? role;
}

// ── HuddleRoom ────────────────────────────────────────────────────────────────

interface AgentVisualState {
  role: string;
  state: AgentState;
  bubbleText?: string;
}

interface PatientInfo {
  age: string;
  gender: string;
  knownConditions?: string;
}

interface HuddleRoomProps {
  symptoms: string;
  patientInfo: PatientInfo;
  onReset?: () => void;
}

export function HuddleRoom({ symptoms, patientInfo, onReset }: HuddleRoomProps) {
  const [agents, setAgents] = useState<Record<string, AgentVisualState>>({});
  const [connections, setConnections] = useState<HuddleConnection[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [synthesis, setSynthesis] = useState<SwarmSynthesis | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [followupRouting, setFollowupRouting] = useState<{ type: "simple" | "complex"; roles: string[] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // positionsRef holds the latest computed agent positions so handleEvent (memoised) can read them
  const positionsRef = useRef<Record<string, AgentPosition>>({});

  const RADIUS = 160;

  const updateAgent = useCallback((role: string, state: AgentState, bubbleText?: string) => {
    setAgents((prev) => ({
      ...prev,
      [role]: { role, state, bubbleText },
    }));
  }, []);

  const addChatMessage = useCallback((agentName: string, content: string, type: ChatMessage["type"], messageType?: ChatMessage["messageType"]) => {
    setChatMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), agentName, content, type, messageType },
    ]);
  }, []);

  const handleEvent = useCallback((event: SwarmEvent) => {
    switch (event.type) {
      case "doctor_activated":
        updateAgent(event.role, "active");
        break;

      case "hypothesis_found":
        updateAgent(event.residentRole, "speaking", `${event.name} (${event.confidence}%)`);
        addChatMessage(
          residentNames[event.residentRole] ?? event.residentRole,
          `${event.name} — confidence ${event.confidence}%`,
          "hypothesis",
        );
        break;

      case "debate_message": {
        updateAgent(event.residentRole, "speaking", event.content.slice(0, 60));
        addChatMessage(
          residentNames[event.residentRole] ?? event.residentRole,
          event.content,
          "debate",
          event.messageType,
        );
        // Draw connection line between the debating resident and the lead
        // positionsRef holds the last-computed positions map (updated in render via useEffect)
        if (event.referencingHypothesisId && positionsRef.current) {
          const fromPos = positionsRef.current[event.residentRole];
          const toPos = positionsRef.current[event.role];
          if (fromPos && toPos) {
            setConnections((prev) => [
              ...prev,
              {
                id: Math.random().toString(36).slice(2),
                fromX: fromPos.x, fromY: fromPos.y,
                toX: toPos.x, toY: toPos.y,
                type: event.messageType,
              },
            ]);
          }
        }
        break;
      }

      case "rectification_complete":
        updateAgent(event.role, "done");
        addChatMessage(
          getAgentDisplayName(event.role),
          event.summary,
          "rectification",
        );
        break;

      case "mdt_message":
        addChatMessage(getAgentDisplayName(event.role), event.content, "mdt", event.messageType as ChatMessage["messageType"]);
        break;

      case "doctor_complete":
        updateAgent(event.role, "done");
        break;

      case "synthesis_complete":
        setSynthesis(event.data);
        // Set all agents to done
        setAgents((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([r, a]) => [r, { ...a, state: "done" as AgentState, bubbleText: undefined }])
          )
        );
        break;

      case "followup_routed":
        setFollowupRouting({ type: event.questionType, roles: event.activatedRoles });
        break;

      case "error":
        addChatMessage("System", event.message, "system");
        break;
    }
  }, [updateAgent, addChatMessage]);

  const startConsultation = useCallback(async () => {
    setIsRunning(true);
    setAgents({});
    setConnections([]);
    setChatMessages([]);
    setSynthesis(null);
    setFollowupRouting(null);

    const response = await fetch("/api/swarm/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms, patientInfo }),
    });

    if (!response.body) { setIsRunning(false); return; }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const event: SwarmEvent = JSON.parse(line.slice(5).trim());
          handleEvent(event);
          if (event.type === "done") { setIsRunning(false); return; }
        } catch { /* ignore parse errors */ }
      }
    }
    setIsRunning(false);
  }, [symptoms, patientInfo, handleEvent]);

  useEffect(() => {
    startConsultation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFollowUp = useCallback(async (question: string) => {
    setFollowupRouting(null);
    const response = await fetch("/api/swarm/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // MVP: "current" is accepted by the backend as any non-empty string.
      // Phase 2: capture real sessionId from a session_id SSE event emitted by /api/swarm/start.
      body: JSON.stringify({ sessionId: "current", question }),
    });
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const event: SwarmEvent = JSON.parse(line.slice(5).trim());
          handleEvent(event);
        } catch { /* ignore */ }
      }
    }
  }, [handleEvent]);

  const allRoles = Object.keys(agents);
  const primaryLead = allRoles.find((r) => agents[r]?.state === "done" || allRoles.length === 1) ?? allRoles[0];
  const positions = computeAgentPositions(
    primaryLead ? [primaryLead] : [],
    allRoles,
    RADIUS
  );
  // Keep positionsRef in sync so handleEvent can read current positions without re-memoising
  positionsRef.current = positions;

  return (
    <div className="flex h-full gap-0">
      {/* Huddle circle area */}
      <div className="flex-1 flex flex-col">
        <div
          ref={containerRef}
          className="relative flex-1"
          style={{ minHeight: 400 }}
        >
          <HuddleConnections
            connections={connections}
            width={containerRef.current?.offsetWidth ?? 600}
            height={containerRef.current?.offsetHeight ?? 400}
          />
          {Object.entries(agents).map(([role, agentState]) => {
            const pos = positions[role] ?? { x: 0, y: 0, isCenter: false };
            return (
              <AgentNode
                key={role}
                name={getAgentDisplayName(role)}
                role={role}
                avatarSeed={getAgentDisplayName(role).split(" ")[0]}
                x={pos.x}
                y={pos.y}
                state={agentState.state}
                bubbleText={agentState.bubbleText}
                isCenter={pos.isCenter}
              />
            );
          })}
          {allRoles.length === 0 && isRunning && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
              Connecting to care team…
            </div>
          )}
        </div>

        {/* Follow-up result */}
        {synthesis && (
          <div className="px-4 pb-2">
            <SynthesisCard synthesis={synthesis} />
          </div>
        )}

        {/* Routing chip */}
        {followupRouting && (
          <div className="px-4 py-1">
            <RoutingChip questionType={followupRouting.type} activatedRoles={followupRouting.roles} />
          </div>
        )}

        {/* Q&A input */}
        {synthesis && (
          <FollowUpBar onSubmit={handleFollowUp} disabled={isRunning} />
        )}
      </div>

      {/* Live chat panel */}
      <div className="w-64 flex-shrink-0">
        <HuddleChatPanel messages={chatMessages} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5.4: Run geometry tests**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test src/__tests__/components/huddle-room.test.tsx
```
Expected: PASS (3 tests)

- [ ] **Step 5.5: TypeScript check**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors.

- [ ] **Step 5.6: Commit**

```bash
git add src/components/consult/HuddleRoom.tsx src/__tests__/components/huddle-room.test.tsx
git commit -m "feat(ui): add HuddleRoom with circle geometry, SSE stream, and follow-up routing"
```

---

## Task 6: AppShell — 3-column layout

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/SessionsColumn.tsx`

- [ ] **Step 6.1: Create Sidebar.tsx**

```tsx
// src/components/layout/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/doctor", label: "Consultations", icon: "🩺" },
  { href: "/doctor/patients", label: "My Patients", icon: "👥" },
  { href: "/doctor/tasks", label: "Tasks", icon: "✓" },
  { href: "/doctor/messages", label: "Messages", icon: "💬" },
  { href: "/doctor/reports", label: "Reports", icon: "📊" },
  { href: "/doctor/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 flex flex-col items-center py-4 gap-2 bg-white border-r border-gray-100 flex-shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm mb-4">
        MC
      </div>

      {/* Nav */}
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          title={item.label}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100 transition-colors ${pathname === item.href ? "bg-blue-50 text-blue-600" : "text-gray-500"}`}
        >
          {item.icon}
        </Link>
      ))}
    </aside>
  );
}
```

- [ ] **Step 6.2: Create SessionsColumn.tsx**

```tsx
// src/components/layout/SessionsColumn.tsx
"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Patient {
  id: string;
  name: string;
  avatarSeed: string;
  urgency: "emergency" | "urgent" | "routine";
  time: string;
  isActive?: boolean;
}

const MOCK_PATIENTS: Patient[] = [
  { id: "1", name: "Jordan K.", avatarSeed: "Jordan", urgency: "routine", time: "Now", isActive: true },
  { id: "2", name: "Maria S.", avatarSeed: "Maria", urgency: "urgent", time: "2:30 PM" },
  { id: "3", name: "David T.", avatarSeed: "David", urgency: "routine", time: "3:00 PM" },
];

const urgencyColor: Record<string, string> = {
  emergency: "bg-red-100 text-red-700",
  urgent: "bg-orange-100 text-orange-700",
  routine: "bg-green-100 text-green-700",
};

export function SessionsColumn({ activePatientId }: { activePatientId?: string }) {
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");

  return (
    <div className="w-56 flex flex-col border-r border-gray-100 bg-white flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["upcoming", "recent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${tab === t ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Patient list */}
      <div className="flex-1 overflow-y-auto">
        {MOCK_PATIENTS.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-50 ${p.isActive || activePatientId === p.id ? "bg-blue-50" : ""}`}
          >
            <div className="relative flex-shrink-0">
              <img
                src={`https://api.dicebear.com/8.x/notionists-neutral/svg?seed=${p.avatarSeed}&size=32`}
                alt={p.name}
                className="w-8 h-8 rounded-full bg-gray-100"
              />
              {(p.isActive || activePatientId === p.id) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-1 ring-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
              <p className="text-[10px] text-gray-400">{p.time}</p>
            </div>
            <Badge className={`text-[9px] px-1 h-4 ${urgencyColor[p.urgency]}`}>
              {p.urgency}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6.3: Create AppShell.tsx**

```tsx
// src/components/layout/AppShell.tsx
"use client";
import { Sidebar } from "./Sidebar";
import { SessionsColumn } from "./SessionsColumn";

interface AppShellProps {
  children: React.ReactNode;
  activePatientId?: string;
}

export function AppShell({ children, activePatientId }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <SessionsColumn activePatientId={activePatientId} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 6.4: Commit**

```bash
git add src/components/layout/
git commit -m "feat(ui): add AppShell 3-column layout (Sidebar + SessionsColumn + main)"
```

---

## Task 7: Integrate into doctor page

**Files:**
- Modify: `src/app/doctor/page.tsx`

Read the existing doctor page first, then wrap with AppShell and add HuddleRoom. The existing `SwarmDebugPanel` can remain for doctors who want the debug view — add it as a tab.

- [ ] **Step 7.1: Read the existing doctor page**

```bash
cat /Users/tasmanstar/Desktop/projects/medicrew/src/app/doctor/page.tsx
```

- [ ] **Step 7.2: Add a demo consultation view with HuddleRoom**

At the top of the doctor page, import and wrap with AppShell. Add a simple patient header bar above HuddleRoom. Example structure:

```tsx
// src/app/doctor/page.tsx — updated top section
import { AppShell } from "@/components/layout/AppShell";
import { HuddleRoom } from "@/components/consult/HuddleRoom";

// In the JSX, wrap the existing return with:
return (
  <AppShell activePatientId="1">
    {/* Patient header bar */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
      <div className="flex items-center gap-3">
        <img src="https://api.dicebear.com/8.x/notionists-neutral/svg?seed=Jordan&size=36" alt="Jordan K." className="w-9 h-9 rounded-full" />
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Jordan K. — Back pain</h2>
          <p className="text-xs text-gray-500">Today · Routine</p>
        </div>
      </div>
    </div>

    {/* HuddleRoom */}
    <div className="flex-1 overflow-hidden">
      <HuddleRoom
        symptoms="I'm 23 years old having back pain due to cycling. Haven't done anything about it. No medicines."
        patientInfo={{ age: "23", gender: "male" }}
      />
    </div>
  </AppShell>
);
```

- [ ] **Step 7.3: TypeScript check**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 7.4: Run all tests**

```bash
cd /Users/tasmanstar/Desktop/projects/medicrew && bun run test
```
Expected: All passing.

- [ ] **Step 7.5: Commit**

```bash
git add src/app/doctor/page.tsx
git commit -m "feat(doctor): integrate AppShell + HuddleRoom into doctor consultation page"
```

---

## Done

Frontend plan complete. The full feature is now end-to-end:
1. Doctor opens consultation page → 3-column layout
2. HuddleRoom auto-starts consultation → agents appear in circle
3. Residents animate with speech bubbles + debate lines
4. Synthesis card appears after rectification + MDT
5. Follow-up Q&A bar appears → smart routing chip shows routing decision
