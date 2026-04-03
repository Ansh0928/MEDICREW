---
phase: 02-core-patient-experience
plan: "03"
subsystem: consultation-streaming
tags: [streaming, sse, agent-identity, langchain, langgraph, ui]
dependency_graph:
  requires:
    - 02-01 # care-team-config, schema, agent definitions
    - 01-02 # LangGraph checkpointer setup
    - 01-03 # Agent definitions and names
  provides:
    - StreamEvent interface with token_delta/node_output/routing event types
    - AgentOverlay component (name, emoji, specialty during streaming)
    - RoutingNotice component (post-triage specialist display)
    - patientContext injection into streamConsultation (PROF-02)
  affects:
    - src/agents/orchestrator.ts
    - src/app/api/consult/route.ts
    - src/app/consult/page.tsx
tech_stack:
  added: []
  patterns:
    - LangGraph streamEvents() v2 for token-level on_llm_stream events
    - SSE with per-token delta events for progressive text rendering
    - AgentOverlay client component pattern (CARE_TEAM, not agentRegistry, in client code)
key_files:
  created:
    - src/components/consult/AgentOverlay.tsx
  modified:
    - src/agents/orchestrator.ts
    - src/app/api/consult/route.ts
    - src/app/consult/page.tsx
decisions:
  - "Use graph.streamEvents() v2 (not llm.stream() per-node) — cleaner separation of concerns, single stream loop handles all node token deltas via on_llm_stream events"
  - "Filter out __start__, __end__, LangGraph wrapper nodes from on_chain_end to avoid emitting spurious node_output events"
  - "CARE_TEAM (not agentRegistry) in client components — agentRegistry has server-only systemPrompts, CARE_TEAM is client-safe"
  - "consult/page.tsx replaced SwarmChat with direct /api/consult SSE streaming — SwarmChat is still available at /api/swarm/start for the swarm experience"
metrics:
  duration: "~15 min"
  completed: "2026-03-26"
  tasks: 2
  files_modified: 4
  files_created: 1
requirements_satisfied:
  - CONS-01
  - CONS-02
  - CONS-03
  - PROF-02
---

# Phase 02 Plan 03: Streaming Consultation UI with Agent Identity Summary

**One-liner:** SSE-based token streaming using LangGraph streamEvents() v2 with per-event agent identity metadata (name, emoji, specialty) and post-triage routing display via AgentOverlay + RoutingNotice components.

## What Was Built

### Task 1: Extended streamConsultation (orchestrator.ts + route.ts)

Added `StreamEvent` interface with new fields:

- `agentName`, `agentRole`, `specialty` — agent identity metadata on every event
- `eventType` — discriminates `token_delta` | `node_output` | `routing` | `complete`
- `delta` — per-token text chunk for progressive rendering

Switched `streamConsultation` from `graph.stream()` to `graph.streamEvents({ version: 'v2' })` which emits:

- `on_llm_stream` events → `token_delta` events with `delta` text (CONS-02: progressive streaming)
- `on_chain_end` events (per node) → `node_output` events with full data + agent identity (CONS-01)
- After triage `on_chain_end` → `routing` event with `relevantSpecialties` (CONS-03)

Added `patientContext` 4th param — fetched from `prisma.patient` in the route and prepended to symptoms as `enrichedSymptoms` (PROF-02).

### Task 2: AgentOverlay + consult/page.tsx

**AgentOverlay.tsx:** Client component showing current speaker during streaming:

- Looks up emoji from CARE_TEAM by agentRole (not agentRegistry — client-safe)
- Shows name, specialty Badge, animated "Speaking..." indicator
- Returns null when not streaming

**RoutingNotice (inline):** Post-triage specialist list with animated green dots.

**consult/page.tsx:** Replaced SwarmChat with direct /api/consult SSE streaming UI:

- Parses `token_delta` → appends to `streamingText` state (progressive rendering)
- Parses `node_output` → finalises message, clears streaming buffer
- Parses `routing` → maps AgentRole to CARE_TEAM names for RoutingNotice
- Shows AgentOverlay above message stream during streaming, clears on [DONE]

## Decisions Made

1. **graph.streamEvents() over per-node llm.stream()** — Plan offered both approaches. `streamEvents()` is cleaner: single loop, LangGraph handles which node is running, metadata.langgraph_node identifies the current agent automatically.

2. **Filter internal LangGraph nodes** — `__start__`, `__end__`, `LangGraph` fire `on_chain_end` events that have no agent identity. Filtered to avoid emitting empty node_output events.

3. **CARE_TEAM in client components** — `agentRegistry` contains `systemPrompt` fields (server-only AI configuration). `CARE_TEAM` has only display data (name, emoji, specialty). Client components import only `CARE_TEAM`.

4. **consult/page.tsx replaces SwarmChat** — The plan specified a direct `/api/consult` streaming UI with AgentOverlay. SwarmChat (which uses `/api/swarm/start`) remains fully functional and accessible.

## Deviations from Plan

None — plan executed exactly as written, using `graph.streamEvents()` as the primary approach (plan's preferred option).

## Self-Check

- [x] `src/components/consult/AgentOverlay.tsx` created
- [x] `src/agents/orchestrator.ts` modified (StreamEvent, streamEvents, token_delta, routing)
- [x] `src/app/api/consult/route.ts` modified (patientContext injection)
- [x] `src/app/consult/page.tsx` modified (AgentOverlay, RoutingNotice, streaming state)
- [x] Build passes: `bun run build` exits 0
- [x] Commits: 7cde4a3, 8d6e6ee

## Self-Check: PASSED
