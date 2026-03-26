# MediCrew — MiroFish Swarm Redesign Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Rebuild AI agent architecture as a 7-layer resident swarm + animated huddle UI + Heidi Health-inspired 3-column layout

---

## 1. Problem

The current swarm (spec: `2026-03-26-medicrew-swarm-design.md`) runs agents in parallel but exposes no visible collaboration to the patient. The consultation feels like a black box: a spinner, then a result. There is no sense of a team working on the problem, no inter-agent debate visible to the patient, and no mechanism for a lead doctor to synthesise conflicting resident opinions before the result is shown.

The goal is to rebuild this as a **MiroFish-style swarm**: one lead specialist plus 4 resident sub-agents per specialty, debating visibly, with the patient watching live through an animated "huddle" UI.

---

## 2. Goals

1. Lead specialist + 4 resident sub-agents per activated specialty, all running in parallel
2. Residents debate each other and challenge hypotheses before the lead synthesises
3. Lead doctor rectifies resident opinions and produces the final recommendation
4. Cross-specialty MDT consult after rectification (e.g. physio lead checks in with GP lead)
5. Patient watches the huddle live — agents animate in a circle, speech bubbles appear, SVG lines connect agents during debate
6. Post-consultation Q&A with smart routing: simple → lead doctor direct; complex → relevant residents re-activate
7. Heidi Health-inspired 3-column layout: sidebar + sessions list + main workspace

---

## 3. Architecture — 7-Layer Swarm

```
L0  PATIENT INPUT       Symptoms + age + gender + known conditions.
                        Input capped at 2000 chars. Sanitised before any LLM call.

L1  TRIAGE              Fast LLM call. Determines urgency + which specialty leads activate.
                        Model: llama-3.3-70b-versatile (JSON mode).
                        Fallback on parse error: urgency = "urgent", all relevant doctors.
                        Output: { urgency, relevantSpecialties[], redFlags[] }

L2  LEAD SPECIALIST     One lead agent per activated specialty (e.g. Emma — Physiotherapy).
                        Reads symptoms + triage output.
                        Does NOT generate a recommendation yet — spawns resident swarm.
                        Emits: doctor_activated event → huddle UI lights up lead avatar.

L3  RESIDENT SWARM      Per lead: Promise.all across 4 resident sub-agents.
    Resident roles:
      - Conservative    Explores conservative/lifestyle approaches
      - Pharmacological Explores medication/clinical options
      - Investigative   Explores diagnostic workup (imaging, bloods)
      - Red-flag        Screens for emergency/urgent flags only
    Each resident: explores ONE angle, returns { hypothesis, confidence 0–100, reasoning }.
    Residents may emit need_clarification (max 2 questions in flight globally).
    If a 3rd clarification would be emitted while 2 are active, it is queued in
    SwarmState.pendingClarifications[]. Queued questions surface one at a time as active
    clarifications are answered. If a resident branch completes before its queued question
    surfaces, the question is discarded (not shown to patient).
    Model: llama-3.3-70b-versatile at temperature 0.1, max 200 tokens per resident.
    Emits: hypothesis_found events → speech bubbles appear in huddle UI.

L4  RESIDENT DEBATE     Sequential within the specialty group.
                        Each resident reads all other residents' outputs.
                        Emits one of: agree | challenge | add_context.
                        Challenge must cite the hypothesis name being challenged.
                        Capped at 1 round (each resident speaks once, max 150 tokens).
                        Emits: debate_message events → SVG connection lines animate between agents.

L5  LEAD RECTIFICATION  Lead specialist reads all resident hypotheses + debate transcript.
                        Determines which residents are correct, partially correct, or overruled.
                        Produces: rectified recommendation for this specialty.
                        Emits: rectification_complete → lead avatar animates "done" state.

L6  MDT CROSS-CONSULT   Lead specialists check in with each other (if >1 specialty activated).
                        Each lead reads the other leads' rectified recommendations.
                        Emits: agree | note | escalate.
                        Escalate → urgency may be raised.
                        Capped at 1 round. Max 200 tokens per lead.
                        Emits: mdt_message events.

L7  SYNTHESIS           Reads all rectified recommendations + MDT notes.
                        Produces final patient-facing result:
                          { urgency, primaryRecommendation, nextSteps[], bookingNeeded, disclaimer }
                        Emits: synthesis_complete → huddle transitions to results view.
```

---

## 4. Named Agents

Named agents follow AHPRA framing: "[Name] AI — [Specialty]". All agents are clearly AI.

| Role | Name | Specialty |
|------|------|-----------|
| Lead — Physiotherapy | Emma AI | Physiotherapy |
| Lead — GP | Alex AI | General Practice |
| Lead — Cardiology | Jordan AI | Cardiology |
| Lead — Mental Health | Maya AI | Mental Health |
| Resident — Conservative | Kai | Conservative |
| Resident — Pharmacological | Priya | Pharmacological |
| Resident — Investigative | Zoe | Investigative |
| Resident — Red-flag | Sam | Red-flag |

Residents are reused across specialties (each specialty spawns its own instances of Kai/Priya/Zoe/Sam with specialty-specific context injected into the prompt).

Avatars: DiceBear `notionists-neutral` style via `https://api.dicebear.com/8.x/notionists-neutral/svg?seed=<Name>`.

---

## 5. SSE Event Schema

```typescript
type SwarmEvent =
  | { type: 'triage_complete'; data: { urgency: string; relevantSpecialties: string[]; redFlags: string[] } }
  | { type: 'phase_changed'; phase: SwarmPhase }
  | { type: 'doctor_activated'; role: string; name: string }
  | { type: 'doctor_complete'; role: string }
  | { type: 'hypothesis_found'; role: string; residentRole: string; hypothesisId: string; name: string; confidence: number }
  | { type: 'question_ready'; clarificationId: string; role: string; question: string }
  | { type: 'debate_message'; role: string; residentRole: string; messageType: 'agree' | 'challenge' | 'add_context'; content: string; referencingHypothesisId?: string }  // same UUID string as hypothesis_found.hypothesisId
  | { type: 'rectification_complete'; role: string; summary: string }
  | { type: 'mdt_message'; role: string; messageType: 'agree' | 'note' | 'escalate'; content: string }
  | { type: 'synthesis_complete'; data: SynthesisResult }
  | { type: 'followup_routed'; questionType: 'simple' | 'complex'; activatedRoles: string[] }
  | { type: 'followup_answer'; answer: string }
  | { type: 'error'; message: string }
  | { type: 'done' }
```

---

## 6. Smart Follow-Up Routing

After `synthesis_complete`, the patient can ask follow-up questions via the bottom Q&A input bar.

**Routing logic (L1-style classifier, same model):**

```
Classify question as simple or complex.
Simple: factual, single-answer, no new symptoms (e.g. "how long should I use the heat pack?")
Complex: involves new symptoms, contradicts the recommendation, or requires re-evaluation
```

**Simple route:** The **primary lead** answers directly. No residents re-activate.
The primary lead is determined at synthesis time: the lead doctor whose specialty contributed
the highest-confidence rectification. If only one specialty was activated, that lead is primary.
This lead is stored in SwarmState as `primaryLeadRole` and used for all simple follow-ups.
- Huddle UI: only the primary lead avatar lights up with a pulse ring.
- Routing chip visible to patient: "Routing to [Lead Name] directly"

**Complex route:** A second LLM classifier call (same model as triage) reads the follow-up question + original symptoms + synthesis output, and returns `{ relevantResidentRoles: string[] }`. Only those residents re-activate (not the full swarm). Residents debate → lead rectifies → answer shown.
- Huddle UI: relevant resident avatars re-animate, SVG connection lines appear.
- Routing chip: "Re-activating relevant specialists"

Maximum 1 follow-up Q&A round re-activates residents. Subsequent follow-ups always go to lead direct (to prevent infinite loops).

---

## 7. Huddle UI — Components

File: `src/components/consult/HuddleRoom.tsx`

### Layout

Heidi Health-inspired 3-column layout:

```
+------------------+-------------------------+----------------------------------+
|  Sidebar         |  Sessions column        |  Main workspace                  |
|  (left nav)      |  (session list)         |  (huddle + Q&A)                  |
+------------------+-------------------------+----------------------------------+
```

### Column 1 — Sidebar

- MediCrew logo (top)
- Nav items: Consultations, My Patients, Tasks, Messages, Templates, Reports, Team, Settings
- Doctor profile (bottom): avatar + name + specialty

### Column 2 — Sessions

- Tabs: Upcoming | Recent
- Patient list rows: avatar + name + urgency badge + time
- Active patient highlighted with live green dot

### Column 3 — Main Workspace

**Top bar:** Patient name + date + urgency badge + action buttons (Video Call, Book Appointment, Share)

**Tabs:** Team Huddle | Patient Profile | Notes

**Huddle area (Team Huddle tab):**
- Progress steps inline: Triage → Specialist → Residents → Debate → Review → Results
- Agents arranged in a circle using trigonometry:
  - Primary lead: fixed at centre (determined by primaryLeadRole from SwarmState)
  - Outer ring: all activated agents except the primary lead, evenly spaced at radius 160px
    using `cos(angle)` / `sin(angle)`. This includes other leads + all residents.
  - Maximum outer agents: 10 (4 residents × 1 primary specialty + up to 3 other leads + 3 overflow residents).
    If >10 outer agents, the circle radius scales to 200px to prevent overlap.
  - Minimum outer agents: 4 (single specialty, 4 residents only).
- Each agent node: DiceBear avatar (48px circle) + name label + animated state ring
- State rings:
  - `idle`: dim grey ring
  - `active`: expanding wave-pulse animation (waveExpand keyframe, 2 rings)
  - `speaking`: bouncing avatar + speech bubble above/beside
  - `done`: green checkmark overlay
- Speech bubbles: positioned based on agent's angular position
  - Right-side agents (angle < 90° or > 270°): bubble anchored left
  - Left-side agents: bubble anchored right
  - Top agents: bubble below
  - Bottom agents: bubble above
- SVG connection lines: dashed, animated stroke-dashoffset, drawn between debating agents
  - Line colour: orange for challenge, green for agree, blue for add_context
- Right chat panel: live text feed of debate messages (overflow hidden, newest at bottom)

**Bottom input bar:**
- Text input + send button
- Routing chip appears after send (shows where question was routed)

---

## 8. Agent Prompt Standards

All specialist prompts must include this block:

```
## Scope Boundaries
You provide health navigation guidance only — not medical diagnoses or prescriptions.
Never state a definitive diagnosis. Use language like "may suggest", "could indicate",
"worth investigating". If you cannot assess confidently, say so explicitly.
Always recommend discussing findings with a qualified healthcare provider.
```

Resident prompts must include their role framing:

```
## Your Role
You are the [Conservative|Pharmacological|Investigative|Red-flag] resident.
Explore ONLY your assigned angle. Do not attempt to synthesise all angles.
Return: { hypothesis, confidence (0–100), reasoning (max 3 sentences) }
```

---

## 9. API Endpoints

### `POST /api/swarm/start`
Start consultation. Returns SSE stream.
Request: `{ symptoms, patientInfo: { age, gender, knownConditions? } }`
Response: `text/event-stream`

### `POST /api/swarm/answer`
Submit patient answer to clarification question.
Request: `{ sessionId, clarificationId, answer }`
Response: `{ ok: true }`

### `POST /api/swarm/followup`
Submit follow-up question after synthesis.
Request: `{ sessionId, question }`
Response: SSE stream (re-uses same event schema, ends with `followup_answer` + `done`)

---

## 10. File Structure

```
src/
  agents/
    swarm-v2.ts              # New 7-layer orchestrator (replaces swarm.ts)
    definitions/
      residents/
        conservative.ts
        pharmacological.ts
        investigative.ts
        red-flag.ts
      leads/
        physiotherapy.ts     # (existing, updated)
        gp.ts                # (existing, updated)
        cardiology.ts        # (existing, updated)
        mental-health.ts     # (existing, updated)
  components/
    consult/
      HuddleRoom.tsx         # Main huddle circle component
      AgentNode.tsx          # Single agent avatar + ring + bubble
      HuddleConnections.tsx  # SVG overlay for debate lines
      HuddleChatPanel.tsx    # Right-side live feed
      FollowUpBar.tsx        # Bottom Q&A input
      RoutingChip.tsx        # Shows routing decision after Q submitted
      SynthesisCard.tsx      # Final result card
    layout/
      AppShell.tsx           # 3-column layout shell
      Sidebar.tsx
      SessionsColumn.tsx
  app/
    portal/
      consultation/
        [sessionId]/
          page.tsx           # Assembles AppShell + HuddleRoom
```

---

## 11. Out of Scope (MVP)

- Session resume across dropped connections (Phase 2, requires Upstash Redis)
- Voice transcription
- Real EHR / booking system integration
- Multi-tenant clinic onboarding
- TGA/AHPRA legal review
- PDF / SOAP note export
- Persistent Prisma session storage for swarm state

---

## 12. Success Criteria

- Patient submits symptoms → huddle agents animate within 2 seconds
- At least 1 resident-level speech bubble visible during a typical consultation
- SVG debate lines appear when a resident challenges another
- Simple follow-up routes to the primary lead with routing chip showing (no residents re-animate)
- Complex follow-up re-activates only relevant residents (not full swarm)
- TypeScript builds 0 errors (`bun run tsc --noEmit`)
- End-to-end consultation completes under 45 seconds on Groq paid plan (no clarifications)
- All agent names follow AHPRA framing (clearly labelled as AI)
